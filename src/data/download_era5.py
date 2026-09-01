"""
CryoNav — Download ERA5 atmospheric reanalysis data.

Source: Copernicus Climate Data Store (CDS)
  https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels

Variables: 10m u/v wind, 2m temperature, mean sea level pressure,
           sea surface temperature, surface solar radiation, total precip.

Requires ~/.cdsapirc:
    url: https://cds.climate.copernicus.eu/api
    key: <YOUR_PERSONAL_ACCESS_TOKEN>

IMPORTANT: Accept the dataset Terms of Use on the dataset page first!
           Requests fail silently if you skip this.

Throughput trick: submit one request per year per variable in parallel.
"""
import os
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN

RAW_DIR = Path(__file__).resolve().parent.parent.parent / DOMAIN["paths"]["raw_data"] / "era5"


# Variables to download — CDS parameter names
ERA5_VARIABLES = [
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "2m_temperature",
    "mean_sea_level_pressure",
    "sea_surface_temperature",
    "surface_solar_radiation_downwards",
    "total_precipitation",
]

# Our domain box
AREA = [
    DOMAIN["region"]["lat_max"],   # North = -50
    DOMAIN["region"]["lon_min"],   # West  = -20
    DOMAIN["region"]["lat_min"],   # South = -78
    DOMAIN["region"]["lon_max"],   # East  = 120
]


def download_era5_year(year: int, variables: list = None, output_dir: Path = None,
                       hours: list = None):
    """
    Download ERA5 single-level data for one year, all variables, domain subset.
    
    Downloads daily means (00, 06, 12, 18 UTC → average later) or specific hours.
    Requests the domain box only to minimize download size.
    """
    import cdsapi
    
    if variables is None:
        variables = ERA5_VARIABLES
    if output_dir is None:
        output_dir = RAW_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if hours is None:
        # 4 × daily, then we average to daily means in the regrid step
        hours = ["00:00", "06:00", "12:00", "18:00"]
    
    output_file = output_dir / f"era5_singlelevels_{year}.nc"
    
    if output_file.exists():
        print(f"  {output_file.name} already exists, skipping")
        return output_file
    
    print(f"  Requesting ERA5 {year} ({len(variables)} variables, {AREA})...")
    
    client = cdsapi.Client()
    
    # Build months/days for the year
    months = [f"{m:02d}" for m in range(1, 13)]
    days = [f"{d:02d}" for d in range(1, 32)]
    
    # For partial years
    end_year = int(DOMAIN["time"]["end_date"][:4])
    if year == end_year:
        end_month = int(DOMAIN["time"]["end_date"][5:7])
        months = [f"{m:02d}" for m in range(1, end_month + 1)]
    
    request = {
        "product_type": ["reanalysis"],
        "variable": variables,
        "year": [str(year)],
        "month": months,
        "day": days,
        "time": hours,
        "area": AREA,  # [N, W, S, E]
        "data_format": "netcdf",
    }
    
    try:
        client.retrieve(
            "reanalysis-era5-single-levels",
            request,
            str(output_file),
        )
        print(f"  ✓ Downloaded {output_file.name} ({output_file.stat().st_size / 1e6:.0f} MB)")
        return output_file
    except Exception as e:
        print(f"  ✗ Failed for {year}: {e}")
        return None


def download_era5_all(start_year: int = 2017, end_year: int = 2024):
    """
    Download ERA5 for all years.
    
    The CDS queue serialises requests, but submitting them all lets them
    queue up rather than waiting in your terminal.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("ERA5 Single Level Download")
    print(f"Years: {start_year}–{end_year}")
    print(f"Variables: {len(ERA5_VARIABLES)}")
    print(f"Domain: {AREA}")
    print(f"Output: {RAW_DIR}")
    print("=" * 60)
    
    results = {}
    for year in range(start_year, end_year + 1):
        result = download_era5_year(year)
        results[year] = result
    
    # Summary
    ok = sum(1 for v in results.values() if v is not None)
    print(f"\nDone: {ok}/{len(results)} years downloaded")
    
    return results


def download_era5_variable_parallel(start_year=2017, end_year=2024):
    """
    Alternative: one request per year × variable (more parallel, smaller files).
    Better for unstable connections.
    """
    import cdsapi
    
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client()
    
    for variable in ERA5_VARIABLES:
        var_dir = RAW_DIR / variable
        var_dir.mkdir(exist_ok=True)
        
        for year in range(start_year, end_year + 1):
            output_file = var_dir / f"era5_{variable}_{year}.nc"
            
            if output_file.exists():
                print(f"  {output_file.name} exists, skipping")
                continue
            
            print(f"  Requesting {variable} {year}...")
            
            months = [f"{m:02d}" for m in range(1, 13)]
            days = [f"{d:02d}" for d in range(1, 32)]
            
            request = {
                "product_type": ["reanalysis"],
                "variable": [variable],
                "year": [str(year)],
                "month": months,
                "day": days,
                "time": ["00:00", "06:00", "12:00", "18:00"],
                "area": AREA,
                "data_format": "netcdf",
            }
            
            try:
                client.retrieve(
                    "reanalysis-era5-single-levels",
                    request,
                    str(output_file),
                )
                print(f"  ✓ {output_file.name}")
            except Exception as e:
                print(f"  ✗ {variable} {year}: {e}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download ERA5 data")
    parser.add_argument("--start-year", type=int, default=2017)
    parser.add_argument("--end-year", type=int, default=2024)
    parser.add_argument("--parallel", action="store_true",
                        help="Download per variable×year (more parallel)")
    args = parser.parse_args()
    
    if args.parallel:
        download_era5_variable_parallel(args.start_year, args.end_year)
    else:
        download_era5_all(args.start_year, args.end_year)
