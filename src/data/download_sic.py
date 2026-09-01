"""
CryoNav — Download NSIDC-0051 v2 Sea Ice Concentration via earthaccess.

Dataset: NSIDC-0051 v2 — NASA Team daily SIC, 25km Polar Stereographic
Access: NASA Earthdata via earthaccess library (uses ~/.netrc)

Files: NSIDC0051_SEAICE_PS_S25km_YYYYMMDD_v2.0.nc (~55 KB each)
       Already on the native 25km NSIDC PS grid — no regridding needed!
"""
import os
import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "sic" / "nsidc_0051"


def download_sic_earthaccess(start_year=2017, end_year=2024):
    """
    Download NSIDC-0051 v2 Southern Hemisphere daily SIC via earthaccess.
    
    Uses the earthdata cloud URLs discovered via CMR search:
    https://data.nsidc.earthdatacloud.nasa.gov/nsidc-cumulus-prod-protected/
        PM/NSIDC-0051/2/YYYY/MM/DD/NSIDC0051_SEAICE_PS_S25km_YYYYMMDD_v2.0.nc
    """
    import earthaccess
    
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NSIDC-0051 v2 SIC Download via earthaccess")
    print(f"Years: {start_year}–{end_year}")
    print(f"Output: {RAW_DIR}")
    print("=" * 60)
    
    auth = earthaccess.login()
    if not auth:
        print("ERROR: Earthdata login failed. Check ~/.netrc")
        return
    print(f"Auth: OK")
    
    for year in range(start_year, end_year + 1):
        # Check existing files for this year
        existing = set(f.name for f in RAW_DIR.glob(f"*_{year}*_v2.0.nc"))
        
        end_month = "12-31"
        if year == end_year:
            end_month = DOMAIN["time"]["end_date"][5:]  # e.g. "06-30"
        
        print(f"\nYear {year}: searching...")
        results = earthaccess.search_data(
            short_name="NSIDC-0051",
            version="2",
            temporal=(f"{year}-01-01", f"{year}-{end_month}"),
            count=5000,
        )
        print(f"  Found {len(results)} total granules")
        
        # Filter: SH daily only (not monthly, not NH)
        sh_daily = []
        for r in results:
            links = r.data_links()
            for link in links:
                fname = link.split("/")[-1]
                if "_PS_S25km_" in fname and re.search(r"_\d{8}_", fname):
                    if fname not in existing:
                        sh_daily.append(r)
                    break
        
        # Deduplicate
        seen = set()
        unique = []
        for r in sh_daily:
            link = r.data_links()[0]
            if link not in seen:
                seen.add(link)
                unique.append(r)
        
        already = len(existing)
        need = len(unique)
        print(f"  SH daily: {already} already have, {need} to download")
        
        if not unique:
            continue
        
        # Download in batches
        batch_size = 100
        for i in range(0, len(unique), batch_size):
            batch = unique[i:i+batch_size]
            print(f"  Batch {i//batch_size + 1}: downloading {len(batch)} files...")
            try:
                earthaccess.download(batch, str(RAW_DIR))
            except Exception as e:
                print(f"  Error in batch: {e}")
                # Fall back to individual downloads
                for r in batch:
                    try:
                        earthaccess.download([r], str(RAW_DIR))
                    except Exception as e2:
                        print(f"    Failed: {r.data_links()[0].split('/')[-1]}: {e2}")
    
    # Final count
    total = len(list(RAW_DIR.glob("NSIDC0051_SEAICE_PS_S25km_*_v2.0.nc")))
    print(f"\nDone! Total SIC files: {total}")
    return RAW_DIR


def verify_sic_files():
    """Quick verification of downloaded SIC files."""
    import xarray as xr
    
    files = sorted(RAW_DIR.glob("NSIDC0051_SEAICE_PS_S25km_*_v2.0.nc"))
    print(f"Total files: {len(files)}")
    
    if files:
        # Check first file
        ds = xr.open_dataset(files[0])
        print(f"\nFirst file: {files[0].name}")
        print(f"  Variables: {list(ds.data_vars)}")
        print(f"  Dimensions: {dict(ds.dims)}")
        
        # Check the SIC variable name
        for v in ds.data_vars:
            if "concentration" in v.lower() or "sic" in v.lower() or "sea_ice" in v.lower():
                arr = ds[v]
                print(f"  SIC variable: '{v}', shape={arr.shape}, dtype={arr.dtype}")
                print(f"  Range: [{float(arr.min()):.3f}, {float(arr.max()):.3f}]")
        
        ds.close()
        
        # Date coverage
        dates = []
        for f in files:
            m = re.search(r"_(\d{8})_", f.name)
            if m:
                dates.append(m.group(1))
        if dates:
            print(f"\nDate range: {dates[0]} to {dates[-1]}")
            print(f"Coverage: {len(dates)} days")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-year", type=int, default=2017)
    parser.add_argument("--end-year", type=int, default=2024)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    
    if args.verify:
        verify_sic_files()
    else:
        download_sic_earthaccess(args.start_year, args.end_year)
        verify_sic_files()
