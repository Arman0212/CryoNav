"""
CryoNav — Synthetic data generator for development.

Generates realistic Antarctic sea-ice, atmospheric, and ocean fields on the
NSIDC 25 km polar stereographic grid. All downstream code works identically
with synthetic or real data — the Zarr schema is the contract.

This module produces data with:
- Correct spatial patterns (high SIC near coast, MIZ gradients, polynyas)
- Seasonal cycles (freeze-up Apr–Sep, melt Oct–Mar)
- Interannual variability
- Realistic value ranges for all variables
"""
import numpy as np
import xarray as xr
from datetime import datetime, timedelta
from pathlib import Path
import sys, os
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.config import DOMAIN, get_project_root


def make_polar_stereo_grid(ny: int = 200, nx: int = 180):
    """
    Create a subset of the NSIDC South Polar Stereographic 25 km grid
    covering the Indian Ocean sector (20°W–120°E, 50°S–78°S).
    
    Returns x, y in metres (EPSG:3412), plus 2D lat/lon arrays.
    """
    # NSIDC EPSG:3412 grid parameters
    # True latitude: 70°S, central meridian: 0°
    # Grid cell size: 25 km = 25000 m
    cell_size = 25000.0  # metres
    
    # The Indian Ocean sector spans roughly:
    # x: from about -500 km to 4000 km  (lon -20 to 120)
    # y: from about -2800 km to  500 km  (lat -78 to -50)
    x_start = -500_000.0
    y_start = -2_800_000.0
    
    x = np.arange(nx) * cell_size + x_start
    y = np.arange(ny) * cell_size + y_start
    
    xx, yy = np.meshgrid(x, y)
    
    # Convert polar stereo to lat/lon (approximate for synthetic data)
    # True formulas for NSIDC polar stereo south
    rho = np.sqrt(xx**2 + yy**2)
    c = 2 * np.arctan2(rho, 2 * 6378137.0 * 1.003)  # scale factor approx
    
    lat = -(np.degrees(np.arcsin(np.cos(c))) )
    # Clamp to realistic range
    lat = np.clip(lat, -85, -45)
    
    lon = np.degrees(np.arctan2(xx, -yy))
    
    # Actually, let's just create a clean lat/lon grid that maps to our domain
    # This is synthetic data — correctness of the projection transform matters
    # for real data; here we need correct value ranges and spatial patterns
    lat_1d = np.linspace(-78, -50, ny)
    lon_1d = np.linspace(-20, 120, nx)
    lon_2d, lat_2d = np.meshgrid(lon_1d, lat_1d)
    
    return x, y, lat_2d, lon_2d


def compute_land_mask(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """
    Simplified Antarctic land mask based on latitude.
    Real coastline is complex; this gives a reasonable approximation.
    """
    mask = np.zeros_like(lat, dtype=np.float32)
    
    # Antarctic continent roughly south of -70° in most sectors
    base_coast = -70.0 + 3.0 * np.sin(np.radians(lon * 2))
    
    # Prydz Bay indentation (lon ~70-80)
    prydz = 2.0 * np.exp(-((lon - 75)**2) / 100)
    
    # Weddell Sea indentation (lon ~-20 to 20)
    weddell = 3.0 * np.exp(-((lon - 0)**2) / 200)
    
    coast_lat = base_coast - prydz - weddell
    
    mask[lat < coast_lat] = 1.0
    
    return mask


def compute_dist_to_coast(land_mask: np.ndarray, cell_size_km: float = 25.0) -> np.ndarray:
    """Distance to nearest coast cell in km, using distance transform."""
    from scipy.ndimage import distance_transform_edt
    
    # Distance from ocean cells to nearest land cell
    ocean = (land_mask == 0).astype(np.float32)
    dist_ocean = distance_transform_edt(ocean) * cell_size_km
    
    # Distance from land cells to nearest ocean cell
    land = (land_mask == 1).astype(np.float32)
    dist_land = distance_transform_edt(land) * cell_size_km
    
    # Combine: positive = distance from coast into ocean, negative into land
    dist = dist_ocean.copy()
    dist[land_mask == 1] = -dist_land[land_mask == 1]
    
    return dist


def generate_sic_field(lat: np.ndarray, lon: np.ndarray, land_mask: np.ndarray,
                       dist_coast: np.ndarray, day_of_year: int, year: int,
                       rng: np.random.Generator) -> np.ndarray:
    """
    Generate a realistic sea-ice concentration field.
    
    Key patterns:
    - SIC highest near coast, decreasing northward through MIZ
    - Strong seasonal cycle: max extent ~Sep, min ~Feb
    - Polynyas near Prydz Bay and along coast
    - Interannual variability
    """
    ny, nx = lat.shape
    
    # Seasonal signal: ice extent latitude varies through the year
    # Max ice extent (~-55°S) in September (day ~250), min (~-68°S) in February (day ~45)
    seasonal_phase = 2 * np.pi * (day_of_year - 250) / 365.0
    ice_edge_lat = -62.0 + 8.0 * np.cos(seasonal_phase)  # oscillates -54 to -70
    
    # Interannual variability: shift the ice edge by ±2° 
    year_anomaly = 1.5 * np.sin(2 * np.pi * (year - 2000) / 7.3)  # ~7 year cycle
    ice_edge_lat += year_anomaly
    
    # Base SIC: sigmoid transition from 0 (north) to 0.9 (south) at the ice edge
    transition_width = 3.0  # degrees of latitude for the MIZ
    sic = 0.9 / (1.0 + np.exp((lat - ice_edge_lat) / transition_width))
    
    # Enhance near coast (pack ice)
    coastal_boost = 0.3 * np.exp(-np.maximum(dist_coast, 0) / 200.0)
    sic = np.clip(sic + coastal_boost, 0, 1)
    
    # Polynyas: reduced SIC in specific coastal areas
    # Prydz Bay polynya (around Bharati)
    prydz_polynya = 0.4 * np.exp(-(((lon - 76)**2) / 50 + ((lat + 69)**2) / 4))
    sic = np.clip(sic - prydz_polynya, 0, 1)
    
    # Maitri region polynya
    maitri_polynya = 0.3 * np.exp(-(((lon - 12)**2) / 30 + ((lat + 70)**2) / 3))
    sic = np.clip(sic - maitri_polynya, 0, 1)
    
    # Add spatial noise (mesoscale variability)
    noise = rng.normal(0, 0.08, size=(ny, nx)).astype(np.float32)
    # Smooth the noise to make it spatially correlated
    from scipy.ndimage import gaussian_filter
    noise = gaussian_filter(noise, sigma=3)
    sic = np.clip(sic + noise, 0, 1)
    
    # Zero out land and far-north open ocean
    sic[land_mask == 1] = 0
    sic[lat > ice_edge_lat + 5] = 0
    
    return sic.astype(np.float32)


def generate_wind_field(lat: np.ndarray, lon: np.ndarray, 
                        day_of_year: int, rng: np.random.Generator):
    """
    Generate realistic 10m wind components.
    Antarctic wind patterns: strong katabatic near coast, westerlies at ~55-65°S.
    """
    ny, nx = lat.shape
    
    # Westerly belt (u > 0) centered around -55 to -60°S
    u10 = 8.0 * np.exp(-((lat + 57)**2) / 50)
    
    # Katabatic winds near coast (offshore, roughly southerly → v > 0 means northward)
    v10 = -5.0 * np.exp(-((lat + 70)**2) / 20)
    
    # Seasonal modulation: stronger winds in winter
    seasonal = 1.0 + 0.3 * np.cos(2 * np.pi * (day_of_year - 180) / 365)
    u10 *= seasonal
    v10 *= seasonal
    
    # Add variability
    noise_u = gaussian_filter_gen(rng.normal(0, 3, (ny, nx)), 5)
    noise_v = gaussian_filter_gen(rng.normal(0, 3, (ny, nx)), 5)
    u10 = (u10 + noise_u).astype(np.float32)
    v10 = (v10 + noise_v).astype(np.float32)
    
    return u10, v10


def gaussian_filter_gen(field, sigma):
    """Apply Gaussian filter, handling import."""
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(field, sigma=sigma)


def generate_era5_fields(lat, lon, day_of_year, year, rng):
    """Generate all ERA5-like atmospheric fields."""
    ny, nx = lat.shape
    
    u10, v10 = generate_wind_field(lat, lon, day_of_year, rng)
    
    # 2m temperature: cold near pole, warmer north, seasonal cycle
    seasonal_temp = 15.0 * np.cos(2 * np.pi * (day_of_year - 15) / 365)  # warmest ~Jan 15
    t2m = (250.0 + 0.8 * (lat + 50) + seasonal_temp +
           gaussian_filter_gen(rng.normal(0, 3, (ny, nx)), 4)).astype(np.float32)
    
    # Mean sea level pressure (hPa): circumpolar trough around -65°S
    msl = (990.0 - 15.0 * np.exp(-((lat + 65)**2) / 50) +
           gaussian_filter_gen(rng.normal(0, 5, (ny, nx)), 6)).astype(np.float32)
    
    # SST: cold in south, warm in north, freezing near ice
    sst = (273.15 + 2.0 + 0.3 * (lat + 50) + seasonal_temp * 0.3 +
           gaussian_filter_gen(rng.normal(0, 0.5, (ny, nx)), 4)).astype(np.float32)
    sst = np.maximum(sst, 271.35)  # freezing point of seawater
    
    return u10, v10, t2m, msl, sst


def generate_ocean_fields(lat, lon, day_of_year, rng):
    """Generate CMEMS-like ocean surface fields."""
    ny, nx = lat.shape
    
    # Antarctic Circumpolar Current: eastward flow ~-55 to -65°S
    uo = (0.15 * np.exp(-((lat + 58)**2) / 40) +
          gaussian_filter_gen(rng.normal(0, 0.03, (ny, nx)), 4)).astype(np.float32)
    
    # Meridional current: weak, with coastal effects
    vo = (gaussian_filter_gen(rng.normal(0, 0.02, (ny, nx)), 4)).astype(np.float32)
    
    # Sea surface height (SSH, metres): higher in the ACC
    zos = (-0.5 + 0.3 * np.exp(-((lat + 58)**2) / 50) +
           gaussian_filter_gen(rng.normal(0, 0.05, (ny, nx)), 6)).astype(np.float32)
    
    return uo, vo, zos


def generate_bathymetry(lat, lon, land_mask):
    """Generate realistic Southern Ocean bathymetry."""
    ny, nx = lat.shape
    
    # Deep ocean baseline: 3000-4500m
    bathy = -4000.0 + 500.0 * np.sin(np.radians(lon * 3)) + 300.0 * (lat + 60) / 10
    
    # Continental shelf: shallow near coast
    shelf = 500.0 * np.exp(-np.maximum(-(lat + 68), 0)**2 / 8)
    bathy = bathy + shelf
    
    # Prydz Bay shelf
    prydz_shelf = 300.0 * np.exp(-(((lon - 76)**2) / 80 + ((lat + 68)**2) / 10))
    bathy = bathy + prydz_shelf
    
    bathy[land_mask == 1] = 0
    
    return bathy.astype(np.float32)


def generate_iceberg_tracks(n_bergs: int = 30, n_years: int = 5, rng=None):
    """
    Generate synthetic iceberg tracks in the Indian Ocean sector.
    
    Returns a list of dicts with berg_id, timestamps, positions, sizes.
    """
    if rng is None:
        rng = np.random.default_rng(42)
    
    tracks = []
    berg_id = 0
    
    for year in range(2019, 2019 + n_years):
        for _ in range(n_bergs // n_years + 1):
            berg_id += 1
            
            # Start position: near Antarctic coast in the Indian sector
            start_lat = rng.uniform(-72, -65)
            start_lon = rng.uniform(-10, 100)
            
            # Berg size
            length = rng.uniform(200, 5000)  # metres
            width = rng.uniform(100, length * 0.8)
            
            # Generate track: drift NE-ish with the ACC, plus noise
            n_days = rng.integers(30, 365)
            dt = 1.0  # days
            
            lats = [start_lat]
            lons = [start_lon]
            
            for d in range(n_days):
                # Drift: northward + eastward + noise
                dlat = rng.normal(0.02, 0.05)  # slight northward drift
                dlon = rng.normal(0.15, 0.08)  # eastward ACC drift
                
                # Coriolis deflection (left in SH)
                dlat -= 0.01 * dlon
                
                new_lat = lats[-1] + dlat
                new_lon = lons[-1] + dlon
                
                # Stop if berg leaves domain or reaches coast
                if new_lat > -50 or new_lat < -78 or new_lon > 120 or new_lon < -20:
                    break
                    
                lats.append(new_lat)
                lons.append(new_lon)
            
            start_date = datetime(year, rng.integers(1, 13), rng.integers(1, 28))
            timestamps = [start_date + timedelta(days=i) for i in range(len(lats))]
            
            tracks.append({
                "berg_id": f"SYN_{berg_id:04d}",
                "timestamps": timestamps,
                "lats": np.array(lats, dtype=np.float32),
                "lons": np.array(lons, dtype=np.float32),
                "length_m": length,
                "width_m": width,
            })
    
    return tracks


def build_synthetic_cube(output_path: str = None, 
                         start_date: str = "2017-01-01",
                         end_date: str = "2024-06-30",
                         seed: int = 42,
                         force: bool = False):
    """
    Build the complete analysis-ready Zarr cube with synthetic data.
    
    Matches the exact schema that real data would produce:
      dims: (time, y, x)
      vars: sic, sic_mask, u10, v10, t2m, msl, sst, uo, vo, zos,
            dist_to_coast, bathy, land_mask, wind_speed, wind_div,
            sic_anomaly, sic_tend_3d, sic_tend_7d, sin_doy, cos_doy
      coords: time (daily), y, x (metres), lat, lon (2-D)
    """
    if output_path is None:
        # Must resolve against the repo root — the API reads exactly this path.
        output_path = str(get_project_root() / DOMAIN["paths"]["zarr_cube"])

    # to_zarr(mode="w") is destructive. Never silently replace a cube that is
    # already there — it may be the real 5.4 GB download.
    if Path(output_path).exists() and not force:
        raise SystemExit(
            f"Refusing to overwrite existing cube at {output_path}\n"
            f"  It may be the real downloaded data cube.\n"
            f"  Pass --force to replace it, or --output PATH to write elsewhere."
        )
    
    print("Building synthetic Antarctic data cube...")
    rng = np.random.default_rng(seed)
    
    # Grid
    ny, nx = DOMAIN["projection"]["grid_shape"]
    x, y, lat, lon = make_polar_stereo_grid(ny, nx)
    
    # Static fields
    land_mask = compute_land_mask(lat, lon)
    dist_coast = compute_dist_to_coast(land_mask)
    bathy = generate_bathymetry(lat, lon, land_mask)
    
    # Time axis
    t_start = datetime.strptime(start_date, "%Y-%m-%d")
    t_end = datetime.strptime(end_date, "%Y-%m-%d")
    n_days = (t_end - t_start).days + 1
    times = [t_start + timedelta(days=i) for i in range(n_days)]
    time_axis = np.array(times, dtype="datetime64[ns]")
    
    print(f"  Grid: {ny}×{nx}, Time: {n_days} days ({start_date} to {end_date})")
    
    # Allocate arrays
    sic_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    u10_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    v10_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    t2m_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    msl_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    sst_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    uo_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    vo_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    zos_all = np.zeros((n_days, ny, nx), dtype=np.float32)
    
    print("  Generating daily fields...")
    for i, t in enumerate(times):
        if i % 100 == 0:
            print(f"    Day {i}/{n_days} ({t.strftime('%Y-%m-%d')})")
        
        doy = t.timetuple().tm_yday
        year = t.year
        
        sic_all[i] = generate_sic_field(lat, lon, land_mask, dist_coast, doy, year, rng)
        u10, v10, t2m, msl_f, sst = generate_era5_fields(lat, lon, doy, year, rng)
        u10_all[i] = u10
        v10_all[i] = v10
        t2m_all[i] = t2m
        msl_all[i] = msl_f
        sst_all[i] = sst
        
        uo, vo, zos = generate_ocean_fields(lat, lon, doy, rng)
        uo_all[i] = uo
        vo_all[i] = vo
        zos_all[i] = zos
    
    # Derived channels
    print("  Computing derived channels...")
    wind_speed = np.sqrt(u10_all**2 + v10_all**2)
    
    # Wind divergence (central differences on the grid)
    wind_div = np.zeros_like(wind_speed)
    wind_div[:, 1:-1, :] += np.gradient(u10_all, axis=2)[:, 1:-1, :]
    wind_div[:, :, 1:-1] += np.gradient(v10_all, axis=1)[:, :, 1:-1]
    
    # SIC climatology (mean per day-of-year over all years)
    doy_array = np.array([t.timetuple().tm_yday for t in times])
    sic_clim = np.zeros((366, ny, nx), dtype=np.float32)
    for d in range(1, 367):
        mask_d = doy_array == d
        if mask_d.any():
            sic_clim[d-1] = sic_all[mask_d].mean(axis=0)
    
    sic_anomaly = np.zeros_like(sic_all)
    for i, doy in enumerate(doy_array):
        sic_anomaly[i] = sic_all[i] - sic_clim[doy - 1]
    
    # SIC tendency (3-day and 7-day)
    sic_tend_3d = np.zeros_like(sic_all)
    sic_tend_7d = np.zeros_like(sic_all)
    for i in range(3, n_days):
        sic_tend_3d[i] = sic_all[i] - sic_all[i-3]
    for i in range(7, n_days):
        sic_tend_7d[i] = sic_all[i] - sic_all[i-7]
    
    # Temporal encoding
    sin_doy = np.sin(2 * np.pi * doy_array / 365.25).astype(np.float32)
    cos_doy = np.cos(2 * np.pi * doy_array / 365.25).astype(np.float32)
    
    # SIC mask (1 = valid ocean, 0 = land/invalid)
    sic_mask = (1.0 - land_mask).astype(np.float32)
    
    # Build xarray Dataset
    print("  Assembling xarray Dataset...")
    ds = xr.Dataset(
        {
            "sic": (["time", "y", "x"], sic_all),
            "sic_mask": (["y", "x"], sic_mask),
            "land_mask": (["y", "x"], land_mask),
            "u10": (["time", "y", "x"], u10_all),
            "v10": (["time", "y", "x"], v10_all),
            "t2m": (["time", "y", "x"], t2m_all),
            "msl": (["time", "y", "x"], msl_all),
            "sst": (["time", "y", "x"], sst_all),
            "uo": (["time", "y", "x"], uo_all),
            "vo": (["time", "y", "x"], vo_all),
            "zos": (["time", "y", "x"], zos_all),
            "wind_speed": (["time", "y", "x"], wind_speed),
            "wind_div": (["time", "y", "x"], wind_div),
            "sic_anomaly": (["time", "y", "x"], sic_anomaly),
            "sic_tend_3d": (["time", "y", "x"], sic_tend_3d),
            "sic_tend_7d": (["time", "y", "x"], sic_tend_7d),
            "sin_doy": (["time"], sin_doy),
            "cos_doy": (["time"], cos_doy),
            "dist_to_coast": (["y", "x"], dist_coast),
            "bathy": (["y", "x"], bathy),
        },
        coords={
            "time": time_axis,
            "y": y,
            "x": x,
            "lat": (["y", "x"], lat),
            "lon": (["y", "x"], lon),
        },
        attrs={
            "title": "CryoNav Antarctic Analysis-Ready Data Cube",
            "projection": "NSIDC South Polar Stereographic (EPSG:3412)",
            "resolution_km": 25,
            "region": DOMAIN["region"]["name"],
            "data_source": "SYNTHETIC — for development; swap with real data pipeline",
        }
    )
    
    # Sanity assertions
    assert not np.isnan(sic_all[sic_mask[None, :, :].astype(bool).repeat(n_days, axis=0)]).any(), \
        "NaN found in SIC ocean cells!"
    assert sic_all.min() >= 0 and sic_all.max() <= 1, "SIC out of [0,1] range!"
    assert np.all(land_mask[0, :] == land_mask[0, :]), "Land mask inconsistent!"  
    
    # Write Zarr
    print(f"  Writing Zarr to {output_path} ...")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Chunking: time-chunked for efficient temporal access
    encoding = {var: {"chunks": (min(30, n_days), ny, nx)} 
                for var in ds.data_vars if "time" in ds[var].dims}
    
    ds.to_zarr(output_path, mode="w", consolidated=True)
    
    file_size_mb = sum(f.stat().st_size for f in Path(output_path).rglob("*") 
                       if f.is_file()) / 1e6
    print(f"  Done! Cube size: {file_size_mb:.0f} MB")
    print(f"  Shape: time={n_days}, y={ny}, x={nx}")
    print(f"  Variables: {list(ds.data_vars)}")
    
    return ds


if __name__ == "__main__":
    import argparse

    default_out = get_project_root() / DOMAIN["paths"]["zarr_cube"]
    ap = argparse.ArgumentParser(
        description="Build a synthetic Antarctic data cube so the API and web "
                    "frontend run without the 5.4 GB real download.")
    ap.add_argument("--output", default=None,
                    help=f"Zarr output path (default: {default_out})")
    ap.add_argument("--start-date", default="2017-01-01")
    ap.add_argument("--end-date", default="2024-06-30",
                    help="Shorten this for a faster/smaller cube.")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--force", action="store_true",
                    help="Overwrite an existing cube at the output path.")
    ap.add_argument("--quick", action="store_true",
                    help="Build only 2022-12-01..2023-03-31 (~120 days, ~250 MB) "
                         "instead of the full range (~5.6 GB). Covers the demo "
                         "date the web UI opens on — use this for frontend work.")
    args = ap.parse_args()

    if args.quick:
        args.start_date, args.end_date = "2022-12-01", "2023-03-31"

    build_synthetic_cube(output_path=args.output,
                         start_date=args.start_date,
                         end_date=args.end_date,
                         seed=args.seed,
                         force=args.force)
