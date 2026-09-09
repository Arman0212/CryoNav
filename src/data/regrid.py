"""
CryoNav — Regridding utilities: real raw sources -> the model grid.

The model grid is an EXACT index slice of the native NSIDC-0051 25 km
southern-hemisphere polar stereographic grid (EPSG:3412) — see
config/domain.yaml. Because it's a true subset (same origin, same 25 km
spacing, no offset), SIC needs no resampling at all: just crop.

ERA5 lives on a different grid entirely (regular lat/lon, ~28 km), so it
does need real interpolation — bilinear, via the model grid's true lat/lon
(computed with pyproj from its EPSG:3412 x/y, not the crude linspace
approximation synthetic.py uses for its placeholder grid).
"""
import numpy as np
from scipy.interpolate import RegularGridInterpolator
from pyproj import Transformer

from src.config import DOMAIN

# Native NSIDC-0051 southern hemisphere grid: 332 (y) x 316 (x), 25 km cells,
# origin at the corner pixel centers (confirmed against a real granule).
NATIVE_NY, NATIVE_NX = 332, 316
NATIVE_X0, NATIVE_Y0, CELL_M = -3_937_500.0, 4_337_500.0, 25_000.0

_EPSG3412_TO_4326 = Transformer.from_crs("EPSG:3412", "EPSG:4326", always_xy=True)


def native_xy():
    """Full native NSIDC-0051 grid coordinates (x ascending, y descending)."""
    x = NATIVE_X0 + np.arange(NATIVE_NX) * CELL_M
    y = NATIVE_Y0 - np.arange(NATIVE_NY) * CELL_M
    return x, y


def domain_slice():
    """
    Row/col slices into the native NSIDC grid that define the model grid.

    Read from config/domain.yaml, which pins them explicitly. They used to be
    recomputed from `region` as the smallest axis-aligned box containing it,
    but that made the grid shape a function of the configured lon/lat window:
    retargeting the region silently reshaped the grid, desynchronising it from
    the trained model, the cached forecasts and the frozen fixtures.
    """
    proj = DOMAIN["projection"]
    r0, r1 = proj["native_row_slice"]
    c0, c1 = proj["native_col_slice"]
    return slice(int(r0), int(r1)), slice(int(c0), int(c1))


def target_grid():
    """
    Returns (x, y, lat, lon, row_slice, col_slice) for the model grid: a
    crop of the native NSIDC grid, plus its true lat/lon (via pyproj) and
    the slices used to crop any native-grid array (e.g. a raw SIC file's
    data) down to this same grid.
    """
    row_slice, col_slice = domain_slice()
    x_native, y_native = native_xy()
    x, y = x_native[col_slice], y_native[row_slice]
    xx, yy = np.meshgrid(x, y)
    lon, lat = _EPSG3412_TO_4326.transform(xx, yy)
    return x, y, lat.astype(np.float32), lon.astype(np.float32), row_slice, col_slice


# NSIDC-0051 flag values, scaled by the file's own scale_factor (0.004) into
# the same units as the concentration fraction. See NSIDC-0051 docs:
# flag_values [251,252,253,254] -> [pole_hole, unused, coast, land]
_FLAG_MISSING_LO = 1.001   # > this and <= _FLAG_COAST_LO: pole_hole/unused
_FLAG_COAST_LO = 1.010     # coast band
_FLAG_LAND_LO = 1.014      # land


def decode_nsidc_sic(raw: np.ndarray):
    """
    Split a raw NSIDC-0051 F17_ICECON array into a concentration fraction
    (NaN outside valid ice range) plus land/coast boolean masks.
    """
    sic = raw.astype(np.float32).copy()
    land = raw >= _FLAG_LAND_LO
    coast = (raw >= _FLAG_COAST_LO) & (raw < _FLAG_LAND_LO)
    missing = (raw > _FLAG_MISSING_LO) & (raw < _FLAG_COAST_LO)
    invalid = land | coast | missing
    sic[invalid] = np.nan
    sic = np.clip(sic, 0.0, 1.0)
    return sic, land, coast


def regrid_era5_day(day_vars: dict, era5_lat: np.ndarray, era5_lon: np.ndarray,
                     tgt_lat: np.ndarray, tgt_lon: np.ndarray) -> dict:
    """
    Bilinear-interpolate one day's ERA5 fields (regular lat/lon grid) onto
    the target 2-D lat/lon field (polar stereo, so not a regular grid in
    lat/lon terms -> RegularGridInterpolator evaluated at scattered points).

    day_vars: {name: 2-D array (lat, lon)} for that day
    era5_lat, era5_lon: 1-D, ascending
    Returns {name: 2-D array (ny, nx)} on the target grid.
    """
    # fill_value=nan (not None/extrapolate): points outside ERA5's own
    # download box come back NaN rather than wild linear-extrapolation
    # artifacts — callers fall back to the synthetic generator for those.
    query = np.stack([tgt_lat.ravel(), tgt_lon.ravel()], axis=-1)
    out = {}
    for name, field in day_vars.items():
        interp = RegularGridInterpolator(
            (era5_lat, era5_lon), field, method="linear",
            bounds_error=False, fill_value=np.nan,
        )
        out[name] = interp(query).reshape(tgt_lat.shape).astype(np.float32)
    return out
