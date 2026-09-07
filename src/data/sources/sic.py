"""
CryoNav — Real Sea Ice Concentration Data Fetcher (NSIDC-0079 & NRT Operations).

Datasets:
- Training / Reanalysis: NSIDC-0079 v4
  Bootstrap Sea Ice Concentrations from Nimbus-7 SMMR and DMSP SSM/I-SSMIS, 25km Southern Hemisphere.
  DOI: 10.5067/79ISG4ZEBJ2R (Comiso et al., NSIDC DAAC).
- Operational / Near-Real-Time:
  Note on NSIDC-0081: The legacy near-real-time SSMIS product (NSIDC-0081) was retired/deprecated by NSIDC.
  Operational daily continuity is provided via AMSR2 (NSIDC-0803) and latest daily NSIDC-0079 granules.

Access: NASA Earthdata via earthaccess (reads credentials from ~/.netrc).
Provenance: Generates <file>.provenance.json with SHA-256 hash for every granule.
"""
import re
from pathlib import Path
from typing import List, Optional
import earthaccess

from src.config import DOMAIN
from src.data.provenance import write_provenance_sidecar, verify_provenance_integrity, MissingDataError

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_SIC_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "sic" / "nsidc_0079"

NSIDC_0079_DOI = "https://doi.org/10.5067/79ISG4ZEBJ2R"
NSIDC_0079_CITATION = "Comiso, J. C. (2017). Bootstrap Sea Ice Concentrations from Nimbus-7 SMMR and DMSP SSM/I-SSMIS, Version 4. Boulder, Colorado USA. NASA National Snow and Ice Data Center Distributed Active Archive Center."


def fetch_sic_granules(
    start_date: str,
    end_date: str,
    output_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> List[Path]:
    """
    Download NSIDC-0079 daily Southern Hemisphere 25 km NetCDF granules for a date range.
    
    Parameters:
        start_date: YYYY-MM-DD
        end_date: YYYY-MM-DD
        output_dir: Target directory (defaults to data/raw/sic/nsidc_0079)
        overwrite: If True, re-download and re-verify existing files.
        
    Returns:
        List of Path objects to verified downloaded files with .provenance.json sidecars.
    """
    dest_dir = Path(output_dir) if output_dir else RAW_SIC_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    auth = earthaccess.login()
    if not auth or not auth.authenticated:
        raise PermissionError("NASA Earthdata authentication failed. Check ~/.netrc")

    print(f"Searching NSIDC-0079 granules: {start_date} to {end_date}...")
    results = earthaccess.search_data(
        short_name="NSIDC-0079",
        version="4",
        temporal=(start_date, end_date),
        count=1000,
    )

    # Filter to Southern Hemisphere daily NetCDF files: _S25km_YYYYMMDD_v4.0.nc
    sh_daily_links = []
    for granule in results:
        for link in granule.data_links():
            fname = link.split("/")[-1]
            if "_S25km_" in fname and re.search(r"_\d{8}_", fname) and fname.endswith(".nc"):
                sh_daily_links.append((link, fname, granule))

    print(f"Found {len(sh_daily_links)} Southern Hemisphere daily granules in CMR.")
    if not sh_daily_links:
        raise MissingDataError(f"No NSIDC-0079 granules found for period {start_date} to {end_date}")

    downloaded_files: List[Path] = []

    for link, fname, granule in sh_daily_links:
        target_path = dest_dir / fname
        date_match = re.search(r"_(\d{4})(\d{2})(\d{2})_", fname)
        date_str = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}" if date_match else "unknown"

        if target_path.exists() and not overwrite:
            try:
                verify_provenance_integrity(target_path)
                downloaded_files.append(target_path)
                continue
            except Exception:
                print(f"Re-downloading {fname} due to missing or invalid provenance.")

        # Download
        print(f"Downloading {fname}...")
        downloaded = earthaccess.download([link], str(dest_dir))
        if not downloaded or not target_path.exists():
            raise MissingDataError(f"Failed to download {link} to {target_path}")

        # Write provenance sidecar
        write_provenance_sidecar(
            filepath=target_path,
            source_name="NSIDC-0079",
            source_url=link,
            product_version="v4.0",
            doi_or_citation=NSIDC_0079_DOI,
            spatial_coverage={
                "projection": "Antarctic Polar Stereographic (EPSG:3412 / EPSG:3031 compatible)",
                "grid_resolution_km": 25,
                "hemisphere": "South",
                "dims": [332, 316],
            },
            temporal_coverage={"observation_date": date_str},
            variables=["F17_ICECON", "crs"],
            extra_metadata={
                "sensor": "SSMIS",
                "algorithm": "Bootstrap",
                "citation": NSIDC_0079_CITATION,
            },
        )
        downloaded_files.append(target_path)

    print(f"Successfully retrieved and verified {len(downloaded_files)} NSIDC-0079 SIC files.")
    return downloaded_files


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download NSIDC-0079 SIC data")
    parser.add_argument("--start", type=str, default="2023-01-15")
    parser.add_argument("--end", type=str, default="2023-01-20")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    fetch_sic_granules(args.start, args.end, overwrite=args.overwrite)
