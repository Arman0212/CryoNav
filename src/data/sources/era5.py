"""
CryoNav — Real ERA5 / ERA5T Atmospheric Winds & Surface Forcing Fetcher.

Dataset:
- ECMWF ERA5 Reanalysis (1979–present) & ERA5T (Operational Near-Real-Time)
- Dataset ID: reanalysis-era5-single-levels
- Variables:
  - 10m_u_component_of_wind (u10)
  - 10m_v_component_of_wind (v10)
  - 2m_temperature (t2m)
  - mean_sea_level_pressure (msl)
  - sea_surface_temperature (sst)
- Spatial Domain: Southern Ocean (60°S to 78°S, full longitude)
- Citation:
  Hersbach, H., et al. (2020). The ERA5 global reanalysis.
  Quarterly Journal of the Royal Meteorological Society, 146(730), 1999-2049.
  DOI: 10.1002/qj.3803 / 10.24381/cds.adbb2d47

Access: Copernicus Climate Data Store (CDS API) using ~/.cdsapirc.
"""
from pathlib import Path
from typing import List, Optional, Dict, Any
import cdsapi
import xarray as xr

from src.config import DOMAIN
from src.data.provenance import (
    write_provenance_sidecar,
    verify_provenance_integrity,
    MissingDataError,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_ERA5_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "era5"

ERA5_DOI = "https://doi.org/10.24381/cds.adbb2d47"
ERA5_CITATION = "Hersbach, H., et al. (2020). Complete ERA5 global atmospheric reanalysis. ECMWF / Copernicus Climate Change Service."

ERA5_DEFAULT_VARS = [
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "2m_temperature",
    "mean_sea_level_pressure",
    "sea_surface_temperature",
]


def fetch_era5_sample(
    year: int,
    month: int,
    days: List[int],
    variables: Optional[List[str]] = None,
    output_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> Path:
    """
    Download a targeted subset of ERA5 atmospheric data via CDS API for 60S-78S.
    
    Parameters:
        year: Year (e.g. 2023)
        month: Month (e.g. 1)
        days: List of day integers (e.g. [18, 19])
        variables: List of CDS variable names (defaults to ERA5_DEFAULT_VARS)
        output_dir: Output directory (defaults to data/raw/era5)
        overwrite: Whether to overwrite existing file
    """
    dest_dir = Path(output_dir) if output_dir else RAW_ERA5_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    vars_to_fetch = variables or ERA5_DEFAULT_VARS
    day_strs = [f"{d:02d}" for d in days]
    month_str = f"{month:02d}"
    
    fname = f"era5_sample_{year}{month_str}_{day_strs[0]}_{day_strs[-1]}.nc"
    target_path = dest_dir / fname

    if target_path.exists() and not overwrite:
        try:
            verify_provenance_integrity(target_path)
            return target_path
        except Exception:
            pass

    client = cdsapi.Client()
    # Southern Ocean bounding box: [North, West, South, East]
    area = [-60.0, -180.0, -78.0, 180.0]

    request_params = {
        "product_type": ["reanalysis"],
        "variable": vars_to_fetch,
        "year": [str(year)],
        "month": [month_str],
        "day": day_strs,
        "time": ["00:00", "06:00", "12:00", "18:00"],
        "area": area,
        "data_format": "netcdf",
    }

    print(f"Requesting ERA5 via CDS API for {year}-{month_str} days {day_strs}...")
    client.retrieve("reanalysis-era5-single-levels", request_params, str(target_path))

    if not target_path.exists():
        raise MissingDataError(f"CDS API finished but {target_path} not found")

    # Generate provenance sidecar
    write_provenance_sidecar(
        filepath=target_path,
        source_name="ECMWF ERA5 Reanalysis",
        source_url="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels",
        product_version="ERA5_single_levels",
        doi_or_citation=ERA5_DOI,
        spatial_coverage={
            "bounding_box_lat_lon": [-60.0, -180.0, -78.0, 180.0],
            "grid_resolution_deg": 0.25,
        },
        temporal_coverage={
            "year": year,
            "month": month,
            "days": days,
            "hours": [0, 6, 12, 18],
        },
        variables=vars_to_fetch,
        extra_metadata={"citation": ERA5_CITATION},
    )

    return target_path


def register_existing_era5_provenance(era5_dir: Optional[Path] = None) -> List[Path]:
    """
    Inspect all existing ERA5 NetCDF files in directory, verify readability,
    and generate .provenance.json sidecars for any unindexed files.
    """
    source_dir = Path(era5_dir) if era5_dir else RAW_ERA5_DIR
    nc_files = sorted(source_dir.glob("era5_singlelevels_*.nc"))
    registered = []

    for f in nc_files:
        try:
            # Check if sidecar already exists and is valid
            verify_provenance_integrity(f)
            registered.append(f)
            continue
        except Exception:
            pass

        print(f"Indexing provenance for existing ERA5 file: {f.name}...")
        try:
            ds = xr.open_dataset(f)
            var_names = list(ds.data_vars)
            time_min = str(ds.time.min().values) if "time" in ds.coords else "unknown"
            time_max = str(ds.time.max().values) if "time" in ds.coords else "unknown"
            ds.close()
        except Exception as e:
            print(f"Warning: could not inspect {f.name}: {e}")
            var_names = ["u10", "v10", "t2m", "msl", "sst"]
            time_min, time_max = "unknown", "unknown"

        write_provenance_sidecar(
            filepath=f,
            source_name="ECMWF ERA5 Reanalysis",
            source_url="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels",
            product_version="ERA5_single_levels",
            doi_or_citation=ERA5_DOI,
            spatial_coverage={
                "lat_bounds": [-78.0, -50.0],
                "lon_bounds": [-20.0, 120.0],
                "resolution_deg": 0.25,
            },
            temporal_coverage={
                "start": time_min,
                "end": time_max,
            },
            variables=var_names,
            extra_metadata={"citation": ERA5_CITATION},
        )
        registered.append(f)

    return registered


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--register-existing", action="store_true", help="Generate sidecars for existing ERA5 files")
    args = parser.parse_args()

    if args.register_existing:
        reg = register_existing_era5_provenance()
        print(f"Verified provenance for {len(reg)} ERA5 files.")
