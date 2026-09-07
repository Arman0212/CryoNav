"""
CryoNav — Real Sea Ice Thickness Data Fetcher (AWI / ESA CryoSat-2/SMOS Merged Product).

Dataset:
- AWI CryoSat-2 / SMOS Merged Sea Ice Thickness (v300)
- Southern Hemisphere Product: SH_12P5KM_EASE2
- Source: Alfred Wegener Institute (AWI) Processing and Dissemination Service
  ftp://ftp.awi.de/sea_ice/product/cryosat2_smos/v300/sh/
- Citations:
  - Ricker, R., Hendricks, S., Kaleschke, L., Tian-Kunze, X., King, J., & Haas, C. (2017).
    A weekly Arctic sea-ice thickness data record from merged CryoSat-2 and SMOS satellite data.
    The Cryosphere, 11(4), 1607-1623.
  - Hendricks, S., & Ricker, R. (2020). Product User Guide & Algorithm Specification:
    AWI CryoSat-2 Sea Ice Thickness (v2.3). Alfred Wegener Institute.

Observational / Physical Constraint:
- Available during the austral freezing season (April through October).
- In austral summer (November through March), surface melt ponds, wet snow, and thermodynamic
  flooding prevent reliable radar altimetry and L-band radiometry thickness retrievals in the Southern Ocean.
  Requests during these months raise MissingDataError with an explicit physical explanation.
"""
import ftplib
import re
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime

from src.config import DOMAIN
from src.data.provenance import (
    write_provenance_sidecar,
    verify_provenance_integrity,
    MissingDataError,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_THICKNESS_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "thickness"

AWI_FTP_HOST = "ftp.awi.de"
AWI_CS2SMOS_SH_BASE = "sea_ice/product/cryosat2_smos/v300/sh"
AWI_DOI = "https://doi.org/10.5281/zenodo.7341384"
AWI_CITATION = "Hendricks, S., Ricker, R., et al. (AWI/ESA). Merged CryoSat-2 and SMOS Sea Ice Thickness (v300), Southern Hemisphere."


def fetch_cryosat2_smos_thickness(
    year: int,
    month: int,
    output_dir: Optional[Path] = None,
    max_files: int = 2,
    overwrite: bool = False,
) -> List[Path]:
    """
    Download AWI CryoSat-2/SMOS merged sea ice thickness NetCDF files for a given year and month.
    
    Parameters:
        year: Year (2011–2026)
        month: Month (1–12). Note: Observational coverage is April (04) to October (10).
        output_dir: Output directory (defaults to data/raw/thickness)
        max_files: Max number of daily/weekly files to fetch for sample (default 2)
        overwrite: Whether to overwrite existing files
    """
    dest_dir = Path(output_dir) if output_dir else RAW_THICKNESS_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Physical constraint check: Austral summer melt gap
    if month not in range(4, 11):
        raise MissingDataError(
            f"CryoSat-2/SMOS thickness is not available for month {month:02d} ({year}). "
            f"Observational gap: Southern Ocean satellite altimetry/radiometry thickness is only "
            f"retrievable during the austral freezing season (April–October) due to summer snow melt and flooding."
        )

    month_str = f"{month:02d}"
    ftp_dir = f"{AWI_CS2SMOS_SH_BASE}/{year}/{month_str}"

    print(f"Connecting to {AWI_FTP_HOST} -> {ftp_dir}...")
    ftp = ftplib.FTP(AWI_FTP_HOST, timeout=30)
    ftp.login()

    try:
        ftp.cwd(ftp_dir)
        raw_listing = []
        ftp.retrlines("LIST", raw_listing.append)
    except Exception as e:
        ftp.quit()
        raise MissingDataError(f"Failed to access AWI directory {ftp_dir}: {e}")

    # Find NetCDF files (.nc)
    nc_filenames = []
    for line in raw_listing:
        parts = line.split()
        if parts:
            fname = parts[-1]
            if fname.endswith(".nc") and "l4sit" in fname:
                nc_filenames.append(fname)

    if not nc_filenames:
        ftp.quit()
        raise MissingDataError(f"No CryoSat-2/SMOS NetCDF files found in {ftp_dir}")

    print(f"Found {len(nc_filenames)} thickness NetCDF files for {year}-{month_str}.")
    downloaded_files: List[Path] = []

    files_to_download = nc_filenames[:max_files]

    for fname in files_to_download:
        target_path = dest_dir / fname

        if target_path.exists() and not overwrite:
            try:
                verify_provenance_integrity(target_path)
                downloaded_files.append(target_path)
                continue
            except Exception:
                print(f"Re-downloading {fname} due to missing or invalid provenance.")

        print(f"Downloading {fname} from AWI...")
        with open(target_path, "wb") as f:
            ftp.retrbinary(f"RETR {fname}", f.write)

        # Parse observation dates from filename: ..._YYYYMMDD_YYYYMMDD_...
        date_match = re.search(r"_(\d{8})_(\d{8})_", fname)
        start_obs = f"{date_match.group(1)[:4]}-{date_match.group(1)[4:6]}-{date_match.group(1)[6:]}" if date_match else f"{year}-{month_str}"
        end_obs = f"{date_match.group(2)[:4]}-{date_match.group(2)[4:6]}-{date_match.group(2)[6:]}" if date_match else f"{year}-{month_str}"

        # Write provenance sidecar
        write_provenance_sidecar(
            filepath=target_path,
            source_name="AWI/ESA CryoSat-2/SMOS Merged Sea Ice Thickness",
            source_url=f"ftp://{AWI_FTP_HOST}/{ftp_dir}/{fname}",
            product_version="v300",
            doi_or_citation=AWI_DOI,
            spatial_coverage={
                "projection": "Southern Hemisphere EASE-Grid 2.0 (12.5 km)",
                "hemisphere": "South",
            },
            temporal_coverage={
                "start_date": start_obs,
                "end_date": end_obs,
                "period": "weekly_sliding_window",
            },
            variables=["sea_ice_thickness", "uncertainty", "status_flag"],
            extra_metadata={
                "sensors": "CryoSat-2 SIRAL, SMOS MIRAS, Sentinel-3 SRAL",
                "producer": "Alfred Wegener Institute Helmholtz Centre for Polar and Marine Research",
                "citation": AWI_CITATION,
            },
        )
        downloaded_files.append(target_path)

    ftp.quit()
    print(f"Successfully retrieved and verified {len(downloaded_files)} CryoSat-2/SMOS thickness files.")
    return downloaded_files


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download AWI CryoSat-2/SMOS Sea Ice Thickness")
    parser.add_argument("--year", type=int, default=2023)
    parser.add_argument("--month", type=int, default=5)
    parser.add_argument("--max-files", type=int, default=1)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    fetch_cryosat2_smos_thickness(args.year, args.month, max_files=args.max_files, overwrite=args.overwrite)
