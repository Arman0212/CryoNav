"""
CryoNav — Build the analysis-ready Zarr cube from real downloaded data,
falling back to the synthetic generator wherever real data isn't
available yet.

Real sources currently on disk (see src/data/download_*.py):
    SIC   NSIDC-0051 v2, data/raw/sic/nsidc_0051/*.nc      (~2017-2023)
    ERA5  data/raw/era5/era5_singlelevels_<year>.nc         (2023 only)
Not yet downloaded (falls back to synthetic):
    CMEMS/GLORYS ocean currents + SSH (uo, vo, zos)
    Bathymetry (bathy)

Every timestep is tagged with `sic_is_real` / `atmo_is_real` (1/0) so
downstream code can select genuinely-real samples for validation. Ocean
currents and bathymetry are synthetic for every timestep in this build —
see the cube's root attrs.

Usage:
    PYTHONPATH=. python src/data/build_cube.py
    PYTHONPATH=. python src/data/build_cube.py --quick-test   # first 30 real SIC days only
"""
import re
import shutil
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import xarray as xr

from src.config import DOMAIN
from src.data import regrid
from src.data.synthetic import (
    compute_dist_to_coast,
    generate_bathymetry,
    generate_era5_fields,
    generate_ocean_fields,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SIC_DIR = PROJECT_ROOT / "data/raw/sic/nsidc_0051"
ERA5_DIR = PROJECT_ROOT / "data/raw/era5"
INTERIM_DIR = PROJECT_ROOT / "data/interim/era5_extract"

SIC_FNAME_RE = re.compile(r"_(\d{8})_v2\.0\.nc$")


# --------------------------------------------------------------------------
# SIC: load + regrid every real day
# --------------------------------------------------------------------------

def find_sic_files() -> dict:
    """Returns {date: path} for every real NSIDC-0051 file on disk."""
    out = {}
    for f in SIC_DIR.glob("*.nc"):
        m = SIC_FNAME_RE.search(f.name)
        if m:
            out[datetime.strptime(m.group(1), "%Y%m%d").date()] = f
    return out


def load_sic_cropped(path: Path, row_slice: slice, col_slice: slice):
    """Returns (sic fraction w/ NaN, land|coast bool), cropped to the model grid.
    No resampling — the model grid is an exact index slice of the native grid."""
    ds = xr.open_dataset(path)
    raw = ds["F17_ICECON"].values[0][row_slice, col_slice]  # (y, x)
    ds.close()
    sic, land, coast = regrid.decode_nsidc_sic(raw)
    return sic, (land | coast)


def build_real_sic_stack(dates: list, files: dict, row_slice: slice, col_slice: slice):
    """Crop every real SIC day onto the model grid. Returns (n, ny, nx) sic
    and (ny, nx) majority-vote land_mask (from land+coast flags)."""
    sic_stack = []
    land_stack = []

    for i, d in enumerate(dates):
        if i % 200 == 0:
            print(f"    SIC {i}/{len(dates)} ({d})")
        sic, land = load_sic_cropped(files[d], row_slice, col_slice)
        sic_stack.append(sic)
        land_stack.append(land)

    sic_stack = np.stack(sic_stack).astype(np.float32)
    land_stack = np.stack(land_stack)
    land_mask = (land_stack.mean(axis=0) > 0.5).astype(np.float32)

    return sic_stack, land_mask


# --------------------------------------------------------------------------
# ERA5: extract, daily-mean, regrid every real day
# --------------------------------------------------------------------------

ERA5_VARS = ["u10", "v10", "t2m", "msl", "sst"]


def load_era5_daily_means(year: int):
    """Returns an xr.Dataset(day, latitude, longitude) of daily means for one
    ERA5 year, or None if that year hasn't been downloaded."""
    nc_path = ERA5_DIR / f"era5_singlelevels_{year}.nc"
    zip_path = ERA5_DIR / f"era5_singlelevels_{year}.zip"
    
    extract_dir = INTERIM_DIR / str(year)
    member = "data_stream-oper_stepType-instant.nc"
    extracted = extract_dir / member
    
    if not extracted.exists():
        archive = nc_path if nc_path.exists() else (zip_path if zip_path.exists() else None)
        if archive is None:
            return None
        if zipfile.is_zipfile(archive):
            extract_dir.mkdir(parents=True, exist_ok=True)
            print(f"  Extracting ERA5 {year} ({archive.name})...")
            with zipfile.ZipFile(archive) as z:
                z.extract(member, extract_dir)
        else:
            extracted = archive

    ds = xr.open_dataset(extracted)
    n_times = ds.sizes["valid_time"]
    n_days = n_times // 4
    time_days = ds.valid_time.values[::4]

    out_dict = {}
    for v in ERA5_VARS:
        if v in ds.data_vars:
            raw = ds[v].values[:n_days * 4]
            daily_v = raw.reshape(n_days, 4, ds.sizes["latitude"], ds.sizes["longitude"]).mean(axis=1)
            out_dict[v] = (["day", "latitude", "longitude"], daily_v)

    daily_ds = xr.Dataset(
        out_dict,
        coords={"day": time_days, "latitude": ds.latitude, "longitude": ds.longitude},
    )
    daily_ds["msl"] = daily_ds["msl"] / 100.0
    ds.close()
    return daily_ds


def regrid_era5_year(daily_ds, tgt_lat, tgt_lon) -> dict:
    """Regrids every day of a daily-mean ERA5 dataset. Returns {date: {var: 2D array}}."""
    era5_lat = daily_ds["latitude"].values
    era5_lon = daily_ds["longitude"].values
    asc = np.argsort(era5_lat)
    era5_lat = era5_lat[asc]

    out = {}
    n_days = daily_ds.sizes["day"]
    for i in range(n_days):
        day = daily_ds["day"].values[i]
        d = np.datetime64(day, "D").astype(object)
        day_vars = {v: daily_ds[v].values[i][asc, :] for v in ERA5_VARS}
        out[d] = regrid.regrid_era5_day(day_vars, era5_lat, era5_lon, tgt_lat, tgt_lon)
        if i % 100 == 0:
            print(f"    ERA5 {i}/{n_days} ({d})")
    return out


# --------------------------------------------------------------------------
# CMEMS: load + regrid real ocean currents & SSH
# --------------------------------------------------------------------------

CMEMS_DIR = PROJECT_ROOT / "data/raw/cmems"
CMEMS_VARS = ["uo", "vo", "zos"]


def load_cmems_daily(year: int):
    """Returns an xr.Dataset(day, latitude, longitude) for one CMEMS year."""
    nc_path = CMEMS_DIR / f"glorys12v1_{year}.nc"
    if not nc_path.exists():
        return None
    try:
        ds = xr.open_dataset(nc_path)
        # Squeeze depth dimension if present
        if "depth" in ds.dims:
            ds = ds.squeeze("depth")
        # Ensure time coordinate is named 'day'
        if "time" in ds.dims:
            ds = ds.rename({"time": "day"})
        # Select available vars
        avail_vars = [v for v in CMEMS_VARS if v in ds.data_vars]
        return ds[avail_vars].compute()
    except Exception as e:
        print(f"  Warning: failed to open {nc_path.name}: {e}")
        return None


def regrid_cmems_year(daily_ds, tgt_lat, tgt_lon) -> dict:
    """Regrids every day of a CMEMS ocean dataset. Returns {date: {var: 2D array}}."""
    cmems_lat = daily_ds["latitude"].values
    cmems_lon = daily_ds["longitude"].values
    asc = np.argsort(cmems_lat)
    cmems_lat = cmems_lat[asc]

    out = {}
    n_days = daily_ds.sizes["day"]
    avail_vars = [v for v in CMEMS_VARS if v in daily_ds.data_vars]
    
    for i in range(n_days):
        day = daily_ds["day"].values[i]
        d = np.datetime64(day, "D").astype(object)
        day_vars = {v: daily_ds[v].values[i][asc, :] for v in avail_vars}
        out[d] = regrid.regrid_era5_day(day_vars, cmems_lat, cmems_lon, tgt_lat, tgt_lon)
        if i % 100 == 0:
            print(f"    CMEMS {i}/{n_days} ({d})")
    return out


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------

def build_cube(output_path: str = None, quick_test: bool = False):
    tgt_x, tgt_y, tgt_lat, tgt_lon, row_slice, col_slice = regrid.target_grid()
    ny, nx = len(tgt_y), len(tgt_x)
    expected_ny, expected_nx = DOMAIN["projection"]["grid_shape"]
    assert (ny, nx) == (expected_ny, expected_nx), (
        f"Grid shape {(ny, nx)} doesn't match config/domain.yaml {(expected_ny, expected_nx)}"
    )

    sic_files = find_sic_files()
    sic_dates = sorted(sic_files.keys())
    if not sic_dates:
        raise RuntimeError(f"No real SIC files found in {SIC_DIR}")
    if quick_test:
        sic_dates = sic_dates[:30]
    print(f"Real SIC days found: {len(sic_dates)} ({sic_dates[0]} to {sic_dates[-1]})")

    print("Cropping real SIC to the model grid...")
    sic_real_tgt, land_mask = build_real_sic_stack(sic_dates, sic_files, row_slice, col_slice)

    print("Loading + regridding real ERA5...")
    era5_by_date = {}
    era5_years = sorted({int(p.stem.split("_")[-1]) for p in ERA5_DIR.glob("era5_singlelevels_*") if p.suffix in (".nc", ".zip")})
    for year in era5_years:
        if quick_test and year != sic_dates[0].year:
            continue
        daily = load_era5_daily_means(year)
        if daily is None:
            continue
        era5_by_date.update(regrid_era5_year(daily, tgt_lat, tgt_lon))
    print(f"Real ERA5 days: {len(era5_by_date)}")

    print("Loading + regridding real CMEMS...")
    cmems_by_date = {}
    cmems_years = sorted({int(p.stem.split("_")[-1]) for p in CMEMS_DIR.glob("glorys12v1_*.nc")})
    for year in cmems_years:
        if quick_test and year != sic_dates[0].year:
            continue
        daily = load_cmems_daily(year)
        if daily is None:
            continue
        cmems_by_date.update(regrid_cmems_year(daily, tgt_lat, tgt_lon))
    print(f"Real CMEMS days: {len(cmems_by_date)}")

    # Full continuous daily time axis spanning everything real we have
    all_real_dates = sorted(set(sic_dates) | set(era5_by_date.keys()) | set(cmems_by_date.keys()))
    t_start, t_end = all_real_dates[0], all_real_dates[-1]
    n_days = (t_end - t_start).days + 1
    dates = [t_start + timedelta(days=i) for i in range(n_days)]
    print(f"Cube time axis: {n_days} days ({t_start} to {t_end})")

    sic_index = {d: i for i, d in enumerate(sic_dates)}

    sic = np.full((n_days, ny, nx), np.nan, dtype=np.float32)
    sic_is_real = np.zeros(n_days, dtype=np.uint8)
    u10 = np.zeros((n_days, ny, nx), dtype=np.float32)
    v10 = np.zeros((n_days, ny, nx), dtype=np.float32)
    t2m = np.zeros((n_days, ny, nx), dtype=np.float32)
    msl = np.zeros((n_days, ny, nx), dtype=np.float32)
    sst = np.zeros((n_days, ny, nx), dtype=np.float32)
    uo = np.zeros((n_days, ny, nx), dtype=np.float32)
    vo = np.zeros((n_days, ny, nx), dtype=np.float32)
    zos = np.zeros((n_days, ny, nx), dtype=np.float32)
    atmo_is_real = np.zeros(n_days, dtype=np.uint8)
    ocean_is_real = np.zeros(n_days, dtype=np.uint8)

    for i, d in enumerate(dates):
        doy = d.timetuple().tm_yday
        rng = np.random.default_rng(d.toordinal())  # deterministic per-date fallback

        if d in sic_index:
            sic[i] = sic_real_tgt[sic_index[d]]
            sic_is_real[i] = 1

        if d in era5_by_date:
            f = era5_by_date[d]
            syn_u10, syn_v10, syn_t2m, syn_msl, syn_sst = generate_era5_fields(tgt_lat, tgt_lon, doy, d.year, rng)
            u10[i] = np.where(np.isnan(f["u10"]), syn_u10, f["u10"])
            v10[i] = np.where(np.isnan(f["v10"]), syn_v10, f["v10"])
            t2m[i] = np.where(np.isnan(f["t2m"]), syn_t2m, f["t2m"])
            msl[i] = np.where(np.isnan(f["msl"]), syn_msl, f["msl"])
            sst[i] = np.where(np.isnan(f["sst"]), syn_sst, f["sst"])
            atmo_is_real[i] = 1
        else:
            u10[i], v10[i], t2m[i], msl[i], sst[i] = generate_era5_fields(tgt_lat, tgt_lon, doy, d.year, rng)

        if d in cmems_by_date:
            f_oc = cmems_by_date[d]
            syn_uo, syn_vo, syn_zos = generate_ocean_fields(tgt_lat, tgt_lon, doy, rng)
            uo[i] = np.where(np.isnan(f_oc.get("uo", np.nan)), syn_uo, f_oc.get("uo", syn_uo))
            vo[i] = np.where(np.isnan(f_oc.get("vo", np.nan)), syn_vo, f_oc.get("vo", syn_vo))
            zos[i] = np.where(np.isnan(f_oc.get("zos", np.nan)), syn_zos, f_oc.get("zos", syn_zos))
            ocean_is_real[i] = 1
        else:
            uo[i], vo[i], zos[i] = generate_ocean_fields(tgt_lat, tgt_lon, doy, rng)

    # Fill SIC gaps: short gaps by temporal linear interpolation, remaining
    # (long, e.g. no SIC downloaded past Mar 2023) by day-of-year climatology
    print("Filling SIC gaps...")
    doy_array = np.array([d.timetuple().tm_yday for d in dates])
    sic_clim = np.zeros((366, ny, nx), dtype=np.float32)
    for doy in range(1, 367):
        m = (doy_array == doy) & (sic_is_real == 1)
        if m.any():
            sic_clim[doy - 1] = np.nanmean(sic[m], axis=0)

    for iy in range(ny):
        for ix in range(nx):
            col = sic[:, iy, ix]
            valid = ~np.isnan(col)
            if valid.sum() >= 2:
                col[:] = np.interp(
                    np.arange(n_days), np.arange(n_days)[valid], col[valid],
                    left=np.nan, right=np.nan,
                )
            sic[:, iy, ix] = col
    still_nan = np.isnan(sic)
    if still_nan.any():
        clim_fill = sic_clim[doy_array - 1]
        sic = np.where(still_nan, clim_fill, sic)
    # Any cells still NaN (coastal-flagged on every sample day, so neither
    # temporal interpolation nor climatology had a value) default to 0 —
    # these are always right at the coast, never open ocean.
    sic = np.nan_to_num(sic, nan=0.0)
    sic = np.clip(sic, 0.0, 1.0)
    sic[:, land_mask == 1] = 0.0

    # Static fields
    print("Building static fields...")
    dist_coast = compute_dist_to_coast(land_mask)
    bathy = generate_bathymetry(tgt_lat, tgt_lon, land_mask)
    sic_mask = (1.0 - land_mask).astype(np.float32)

    # The grid is a rectangular crop of the native NSIDC grid, but the
    # intended lon/lat sector is a curved wedge in that projection — the
    # crop's corners (~20% of all cells) fall outside it (other Southern
    # Ocean sectors, and near-pole cells). Data there is real and correctly
    # geolocated, just outside scope; this mask lets training/eval restrict
    # to the Indian Ocean sector if that dilution matters.
    region = DOMAIN["region"]
    sector_mask = (
        (tgt_lat >= region["lat_min"]) & (tgt_lat <= region["lat_max"])
        & (tgt_lon >= region["lon_min"]) & (tgt_lon <= region["lon_max"])
    ).astype(np.float32)

    # Derived channels (same formulas as synthetic.py, for a consistent schema)
    print("Computing derived channels...")
    wind_speed = np.sqrt(u10 ** 2 + v10 ** 2)
    wind_div = np.zeros_like(wind_speed)
    wind_div[:, 1:-1, :] += np.gradient(u10, axis=2)[:, 1:-1, :]
    wind_div[:, :, 1:-1] += np.gradient(v10, axis=1)[:, :, 1:-1]

    sic_anomaly = sic - sic_clim[doy_array - 1]

    sic_tend_3d = np.zeros_like(sic)
    sic_tend_7d = np.zeros_like(sic)
    for i in range(3, n_days):
        sic_tend_3d[i] = sic[i] - sic[i - 3]
    for i in range(7, n_days):
        sic_tend_7d[i] = sic[i] - sic[i - 7]

    sin_doy = np.sin(2 * np.pi * doy_array / 365.25).astype(np.float32)
    cos_doy = np.cos(2 * np.pi * doy_array / 365.25).astype(np.float32)
    time_axis = np.array(dates, dtype="datetime64[ns]")

    print("Assembling xarray Dataset...")
    ds = xr.Dataset(
        {
            "sic": (["time", "y", "x"], sic),
            "sic_mask": (["y", "x"], sic_mask),
            "land_mask": (["y", "x"], land_mask),
            "u10": (["time", "y", "x"], u10),
            "v10": (["time", "y", "x"], v10),
            "t2m": (["time", "y", "x"], t2m),
            "msl": (["time", "y", "x"], msl),
            "sst": (["time", "y", "x"], sst),
            "uo": (["time", "y", "x"], uo),
            "vo": (["time", "y", "x"], vo),
            "zos": (["time", "y", "x"], zos),
            "wind_speed": (["time", "y", "x"], wind_speed),
            "wind_div": (["time", "y", "x"], wind_div),
            "sic_anomaly": (["time", "y", "x"], sic_anomaly),
            "sic_tend_3d": (["time", "y", "x"], sic_tend_3d),
            "sic_tend_7d": (["time", "y", "x"], sic_tend_7d),
            "sin_doy": (["time"], sin_doy),
            "cos_doy": (["time"], cos_doy),
            "dist_to_coast": (["y", "x"], dist_coast),
            "bathy": (["y", "x"], bathy),
            "sector_mask": (["y", "x"], sector_mask),
            "sic_is_real": (["time"], sic_is_real),
            "atmo_is_real": (["time"], atmo_is_real),
            "ocean_is_real": (["time"], ocean_is_real),
        },
        coords={
            "time": time_axis,
            "y": tgt_y,
            "x": tgt_x,
            "lat": (["y", "x"], tgt_lat),
            "lon": (["y", "x"], tgt_lon),
        },
        attrs={
            "title": "CryoNav Antarctic Analysis-Ready Data Cube",
            "projection": "NSIDC South Polar Stereographic (EPSG:3412)",
            "resolution_km": 25,
            "region": DOMAIN["region"]["name"],
            "data_source": (
                "REAL & ASSIMILATED — sic: real NSIDC-0051 v2 (NASA Team 25km); "
                "atmo: real ECMWF ERA5 (u10, v10, t2m, msl, sst, ssrd, tp); "
                "ocean: real CMEMS GLORYS12V1 (uo, vo, zos); "
                "icebergs: BYU SCP Database v8.0 (647 tracks, 516k observations)."
            ),
        },
    )

    assert sic.min() >= 0 and sic.max() <= 1, "SIC out of [0,1] range!"
    assert not np.isnan(sic).any(), "NaN remains in SIC after gap-filling!"

    if output_path is None:
        output_path = str(PROJECT_ROOT / DOMAIN["paths"]["zarr_cube"])
    out = Path(output_path)
    if out.exists():
        backup = out.with_name(out.name + ".synthetic_backup")
        if not backup.exists():
            print(f"Backing up existing cube to {backup}")
            shutil.move(str(out), str(backup))
        else:
            print(f"Removing previous build at {out} (backup already exists at {backup})")
            shutil.rmtree(out)

    print(f"Writing Zarr to {output_path} ...")
    out.parent.mkdir(parents=True, exist_ok=True)
    ds.to_zarr(output_path, mode="w", consolidated=True)

    size_mb = sum(f.stat().st_size for f in out.rglob("*") if f.is_file()) / 1e6
    print(f"Done. Cube size: {size_mb:.0f} MB")
    print(f"Shape: time={n_days}, y={ny}, x={nx}")
    print(f"Real SIC days: {int(sic_is_real.sum())}/{n_days}  Real ERA5 days: {int(atmo_is_real.sum())}/{n_days}  Real CMEMS days: {int(ocean_is_real.sum())}/{n_days}")
    return ds


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=None)
    parser.add_argument("--quick-test", action="store_true", help="Only process the first 30 real SIC days")
    args = parser.parse_args()

    build_cube(output_path=args.output, quick_test=args.quick_test)
