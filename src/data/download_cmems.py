"""
CryoNav — Download CMEMS ocean reanalysis (GLORYS12V1).

Source: Copernicus Marine Service
  Product: GLOBAL_MULTIYEAR_PHY_001_030 (reanalysis, 1993–present)
  Forecast: GLOBAL_ANALYSISFORECAST_PHY_001_024 (for recent dates)

Variables: surface currents (uo, vo), SSH (zos), SST (thetao), salinity (so)
Resolution: 1/12° (~8 km), daily

Access: `copernicusmarine` CLI/Python library
  First run: `copernicusmarine login` to store credentials
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN

RAW_DIR = Path(__file__).resolve().parent.parent.parent / DOMAIN["paths"]["raw_data"] / "cmems"

# Dataset IDs
REANALYSIS_DATASET = "cmems_mod_glo_phy_my_0.083deg_P1D-m"       # GLORYS12V1 daily
FORECAST_DATASET = "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m"   # Analysis-forecast

# Variables
VARIABLES = ["uo", "vo", "zos", "thetao", "so"]

# Domain box
LON_MIN = DOMAIN["region"]["lon_min"]  # -20
LON_MAX = DOMAIN["region"]["lon_max"]  # 120
LAT_MIN = DOMAIN["region"]["lat_min"]  # -78
LAT_MAX = DOMAIN["region"]["lat_max"]  # -50


def download_cmems_year(year: int, output_dir: Path = None):
    """
    Download GLORYS12V1 for one year using copernicusmarine subset.
    
    The toolbox subsets remotely, so you download only your domain box.
    """
    import copernicusmarine
    
    if output_dir is None:
        output_dir = RAW_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"glorys12v1_{year}.nc"
    
    if output_file.exists():
        print(f"  {output_file.name} already exists, skipping")
        return output_file
    
    print(f"  Requesting GLORYS12V1 {year}...")
    
    # Date range for this year
    start_date = f"{year}-01-01"
    end_year_limit = int(DOMAIN["time"]["end_date"][:4])
    if year == end_year_limit:
        end_date = DOMAIN["time"]["end_date"]
    else:
        end_date = f"{year}-12-31"
    
    try:
        copernicusmarine.subset(
            dataset_id=REANALYSIS_DATASET,
            variables=VARIABLES,
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=f"{start_date}T00:00:00",
            end_datetime=f"{end_date}T23:59:59",
            minimum_depth=0.4,
            maximum_depth=0.6,  # surface layer (~0.5m)
            output_filename=str(output_file.name),
            output_directory=str(output_dir),
            overwrite=True,
        )
        
        if output_file.exists():
            size_mb = output_file.stat().st_size / 1e6
            print(f"  ✓ Downloaded {output_file.name} ({size_mb:.1f} MB)")
        return output_file
        
    except Exception as e:
        print(f"  ✗ Failed for {year}: {e}")
        
        # Try forecast dataset for recent years
        if year >= 2023:
            print(f"  Trying analysis-forecast dataset for {year}...")
            try:
                copernicusmarine.subset(
                    dataset_id=FORECAST_DATASET,
                    variables=["uo", "vo"],
                    minimum_longitude=LON_MIN,
                    maximum_longitude=LON_MAX,
                    minimum_latitude=LAT_MIN,
                    maximum_latitude=LAT_MAX,
                    start_datetime=f"{start_date}T00:00:00",
                    end_datetime=f"{end_date}T23:59:59",
                    minimum_depth=0.4,
                    maximum_depth=0.6,
                    output_filename=f"cmems_forecast_{year}.nc",
                    output_directory=str(output_dir),
                    overwrite=True,
                )
                print(f"  ✓ Forecast dataset downloaded for {year}")
            except Exception as e2:
                print(f"  ✗ Forecast also failed: {e2}")
        
        return None


def download_cmems_all(start_year: int = 2017, end_year: int = 2024):
    """Download GLORYS12V1 for all years."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("CMEMS GLORYS12V1 Download")
    print(f"Years: {start_year}–{end_year}")
    print(f"Variables: {VARIABLES}")
    print(f"Domain: [{LAT_MIN}, {LON_MIN}] to [{LAT_MAX}, {LON_MAX}]")
    print(f"Output: {RAW_DIR}")
    print("=" * 60)
    
    results = {}
    for year in range(start_year, end_year + 1):
        result = download_cmems_year(year)
        results[year] = result
    
    ok = sum(1 for v in results.values() if v is not None)
    print(f"\nDone: {ok}/{len(results)} years downloaded")
    return results


def setup_cmems_credentials():
    """Interactive CMEMS credential setup."""
    print("Setting up Copernicus Marine credentials...")
    print("This will prompt for your username and password.")
    print("Get credentials at: https://data.marine.copernicus.eu/register")
    
    import subprocess
    subprocess.run([sys.executable, "-m", "copernicusmarine", "login"], check=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download CMEMS ocean data")
    parser.add_argument("--start-year", type=int, default=2017)
    parser.add_argument("--end-year", type=int, default=2024)
    parser.add_argument("--login", action="store_true", help="Setup credentials first")
    args = parser.parse_args()
    
    if args.login:
        setup_cmems_credentials()
    
    download_cmems_all(args.start_year, args.end_year)
