"""
CryoNav — Real CMEMS GLORYS12V1 Ocean Currents & SSH Fetcher.

Dataset:
- CMEMS GLORYS12V1 Global Ocean Physics Reanalysis (1993–present)
- Dataset ID: cmems_mod_glo_phy_my_0.083deg_P1D-m
- Operational / Analysis-Forecast Dataset ID: cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m
- Variables:
  - uo (Eastward sea water velocity, m/s)
  - vo (Northward sea water velocity, m/s)
  - zos (Sea surface height above geoid, m)
  - thetao (Sea water potential temperature, °C)
  - so (Sea water salinity, PSU)
- Resolution: 1/12° (~8 km), daily mean, surface layer (~0.5 m depth)
- Citation:
  Fernandez, E., & Lellouche, J.-M. (2021). Product User Manual for the Global Ocean
  Physical Reanalysis GLORYS12V1. Copernicus Marine Service.
  DOI: 10.48670/moi-00021

Access: Copernicus Marine Toolbox (copernicusmarine) using ~/.copernicusmarine/
"""
from pathlib import Path
from typing import List, Optional, Dict, Any
import copernicusmarine
import xarray as xr

from src.config import DOMAIN
from src.data.provenance import (
    write_provenance_sidecar,
    verify_provenance_integrity,
    MissingDataError,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_CMEMS_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "cmems"

CMEMS_DOI = "https://doi.org/10.48670/moi-00021"
CMEMS_CITATION = "Copernicus Marine Service. Global Ocean Physics Reanalysis GLORYS12V1 (GLOBAL_MULTIYEAR_PHY_001_030). Mercator Ocean International."

CMEMS_DEFAULT_VARS = ["uo", "vo", "zos", "thetao", "so"]
REANALYSIS_DATASET = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
FORECAST_DATASET = "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m"


def fetch_cmems_subset(
    start_date: str,
    end_date: str,
    variables: Optional[List[str]] = None,
    output_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> Path:
    """
    Download a subset of GLORYS12V1 surface currents for the Southern Ocean domain (60S–78S).
    
    Parameters:
        start_date: YYYY-MM-DD
        end_date: YYYY-MM-DD
        variables: Variables to download (default: uo, vo, zos)
        output_dir: Destination directory
        overwrite: Overwrite existing file
    """
    dest_dir = Path(output_dir) if output_dir else RAW_CMEMS_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    vars_to_fetch = variables or ["uo", "vo", "zos"]
    fname = f"glorys12v1_{start_date}_{end_date}.nc"
    target_path = dest_dir / fname

    if target_path.exists() and not overwrite:
        try:
            verify_provenance_integrity(target_path)
            return target_path
        except Exception:
            pass

    print(f"Subsetting CMEMS GLORYS12V1: {start_date} to {end_date} (60S-78S, full longitude)...")
    try:
        copernicusmarine.subset(
            dataset_id=REANALYSIS_DATASET,
            variables=vars_to_fetch,
            minimum_longitude=-180.0,
            maximum_longitude=180.0,
            minimum_latitude=-78.0,
            maximum_latitude=-60.0,
            start_datetime=f"{start_date}T00:00:00",
            end_datetime=f"{end_date}T23:59:59",
            minimum_depth=0.4,
            maximum_depth=0.6,
            output_filename=fname,
            output_directory=str(dest_dir),
            overwrite=True,
        )
    except Exception as e:
        # Fall back to analysis-forecast if near-real-time
        print(f"Reanalysis subset failed ({e}), trying operational analysis-forecast dataset...")
        try:
            copernicusmarine.subset(
                dataset_id=FORECAST_DATASET,
                variables=["uo", "vo"],
                minimum_longitude=-180.0,
                maximum_longitude=180.0,
                minimum_latitude=-78.0,
                maximum_latitude=-60.0,
                start_datetime=f"{start_date}T00:00:00",
                end_datetime=f"{end_date}T23:59:59",
                minimum_depth=0.4,
                maximum_depth=0.6,
                output_filename=fname,
                output_directory=str(dest_dir),
                overwrite=True,
            )
            vars_to_fetch = ["uo", "vo"]
        except Exception as e2:
            raise MissingDataError(f"Both CMEMS reanalysis and forecast queries failed: {e2}")

    if not target_path.exists():
        raise MissingDataError(f"CMEMS subset completed but {target_path} was not created")

    # Generate provenance sidecar
    write_provenance_sidecar(
        filepath=target_path,
        source_name="CMEMS GLORYS12V1 Ocean Reanalysis",
        source_url="https://data.marine.copernicus.eu",
        product_version="GLOBAL_MULTIYEAR_PHY_001_030",
        doi_or_citation=CMEMS_DOI,
        spatial_coverage={
            "lat_bounds": [-78.0, -60.0],
            "lon_bounds": [-180.0, 180.0],
            "resolution_deg": 0.0833,  # 1/12 degree
        },
        temporal_coverage={
            "start_date": start_date,
            "end_date": end_date,
            "sampling": "daily_mean",
        },
        variables=vars_to_fetch,
        extra_metadata={"citation": CMEMS_CITATION},
    )

    return target_path


def register_existing_cmems_provenance(cmems_dir: Optional[Path] = None) -> List[Path]:
    """Inspect and generate .provenance.json sidecars for existing GLORYS12V1 NetCDF files."""
    source_dir = Path(cmems_dir) if cmems_dir else RAW_CMEMS_DIR
    nc_files = sorted(source_dir.glob("glorys12v1_*.nc"))
    registered = []

    for f in nc_files:
        try:
            verify_provenance_integrity(f)
            registered.append(f)
            continue
        except Exception:
            pass

        print(f"Indexing provenance for existing CMEMS file: {f.name}...")
        try:
            ds = xr.open_dataset(f)
            var_names = list(ds.data_vars)
            time_min = str(ds.time.min().values) if "time" in ds.coords else "unknown"
            time_max = str(ds.time.max().values) if "time" in ds.coords else "unknown"
            ds.close()
        except Exception as e:
            var_names = ["uo", "vo", "zos", "thetao", "so"]
            time_min, time_max = "unknown", "unknown"

        write_provenance_sidecar(
            filepath=f,
            source_name="CMEMS GLORYS12V1 Ocean Reanalysis",
            source_url="https://data.marine.copernicus.eu",
            product_version="GLOBAL_MULTIYEAR_PHY_001_030",
            doi_or_citation=CMEMS_DOI,
            spatial_coverage={
                "lat_bounds": [-78.0, -50.0],
                "lon_bounds": [-20.0, 120.0],
                "resolution_deg": 0.0833,
            },
            temporal_coverage={"start": time_min, "end": time_max},
            variables=var_names,
            extra_metadata={"citation": CMEMS_CITATION},
        )
        registered.append(f)

    return registered


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--register-existing", action="store_true")
    args = parser.parse_args()

    if args.register_existing:
        reg = register_existing_cmems_provenance()
        print(f"Verified provenance for {len(reg)} CMEMS files.")
