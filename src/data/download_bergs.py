"""
CryoNav — Download BYU/NIC Antarctic Iceberg Tracking Database.

Source: https://www.scp.byu.edu/data/iceberg/default.html
  - Consolidated Database v7.1 (~3.5 MB zip)
  - Statistical Database v7.1 (daily averaged position, size, rotation)
  - Coverage: 1978 – late August 2023
  - Format: plain CSV, sensor codes, decimal degrees

This is OPEN ACCESS — no login required. Just a zip download.
"""
import os
import sys
import requests
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN

RAW_DIR = Path(__file__).resolve().parent.parent.parent / DOMAIN["paths"]["raw_data"] / "bergs"

# BYU Iceberg Database URLs
BYU_BASE = "https://www.scp.byu.edu/data/iceberg"
BYU_CONSOLIDATED_URL = f"{BYU_BASE}/database1.zip"       # Consolidated DB v7.1
BYU_STATISTICAL_URL = f"{BYU_BASE}/database2.zip"         # Statistical DB v7.1

# Alternative URLs if the above change
BYU_ALT_URLS = [
    "https://www.scp.byu.edu/data/iceberg/database1.zip",
    "https://www.scp.byu.edu/data/iceberg/database2.zip",
]


def download_byu_database(output_dir: Path = None):
    """
    Download and extract the BYU Antarctic Iceberg Tracking Database.
    
    Downloads both:
    1. Consolidated Database — all individual observations
    2. Statistical Database — daily averaged positions with size estimates
    """
    if output_dir is None:
        output_dir = RAW_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("BYU Antarctic Iceberg Tracking Database")
    print("=" * 60)
    
    databases = [
        ("Consolidated DB v7.1", BYU_CONSOLIDATED_URL, "database1.zip"),
        ("Statistical DB v7.1", BYU_STATISTICAL_URL, "database2.zip"),
    ]
    
    for name, url, filename in databases:
        zip_path = output_dir / filename
        
        if zip_path.exists():
            print(f"\n  {filename} already exists, skipping download")
        else:
            print(f"\n  Downloading {name}...")
            print(f"  URL: {url}")
            
            try:
                resp = requests.get(url, timeout=60, stream=True)
                resp.raise_for_status()
                
                with open(zip_path, 'wb') as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                size_mb = zip_path.stat().st_size / 1e6
                print(f"  ✓ Downloaded {filename} ({size_mb:.1f} MB)")
                
            except Exception as e:
                print(f"  ✗ Download failed: {e}")
                print(f"  Try manually: wget {url}")
                continue
        
        # Extract
        extract_dir = output_dir / filename.replace(".zip", "")
        if extract_dir.exists() and any(extract_dir.iterdir()):
            print(f"  {extract_dir.name}/ already extracted")
        else:
            print(f"  Extracting {filename}...")
            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(extract_dir)
                
                # List extracted files
                files = list(extract_dir.rglob("*"))
                print(f"  ✓ Extracted {len(files)} files to {extract_dir.name}/")
                for f in files[:10]:
                    print(f"    {f.relative_to(extract_dir)}")
                if len(files) > 10:
                    print(f"    ... and {len(files) - 10} more")
                    
            except Exception as e:
                print(f"  ✗ Extraction failed: {e}")
    
    print(f"\nOutput: {output_dir}")
    return output_dir


def download_nic_weekly(output_dir: Path = None):
    """
    Download US National Ice Center weekly iceberg positions.
    
    For recent bergs past the BYU cutoff (Aug 2023) and named bergs.
    Source: https://usicecenter.gov/Products/AntarcIcebergs
    """
    if output_dir is None:
        output_dir = RAW_DIR / "nic"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # NIC Antarctic Iceberg CSV (latest positions)
    nic_url = "https://usicecenter.gov/File/DownloadProduct?products=%2Fweekly%2Fantarctic&fName=AntarcticIcebergs"
    
    print("\n  Downloading NIC weekly iceberg positions...")
    try:
        resp = requests.get(nic_url, timeout=30)
        if resp.status_code == 200:
            output_file = output_dir / "nic_antarctic_icebergs.csv"
            output_file.write_bytes(resp.content)
            print(f"  ✓ Downloaded NIC data ({len(resp.content)} bytes)")
        else:
            print(f"  ✗ NIC download returned status {resp.status_code}")
            print(f"  Try manually from: https://usicecenter.gov/Products/AntarcIcebergs")
    except Exception as e:
        print(f"  ✗ NIC download failed: {e}")
    
    return output_dir


if __name__ == "__main__":
    download_byu_database()
    download_nic_weekly()
