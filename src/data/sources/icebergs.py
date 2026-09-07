"""
CryoNav — Real BYU / US NIC Antarctic Iceberg Tracking Database Fetcher.

Dataset:
- BYU Center for Remote Sensing Antarctic Iceberg Tracking Database
  - Source: https://www.scp.byu.edu/data/iceberg/
  - Consolidated Database (all satellite radar observations)
  - Statistical Database (daily averaged positions, length, width, rotation)
- US National Ice Center (US NIC) Weekly Antarctic Iceberg Positions
  - Source: https://usicecenter.gov/Products/AntarcIcebergs
- Citations:
  - Budge, J. S., & Long, D. G. (2018). A revised Antarctic iceberg tracking database.
    IEEE Journal of Selected Topics in Applied Earth Observations and Remote Sensing, 11(1), 34-42.
  - Stuart, K. M., & Long, D. G. (2011). Tracking large Antarctic icebergs using QuikSCAT.
    IEEE Transactions on Geoscience and Remote Sensing, 49(12), 4805-4814.
"""
import os
import re
import zipfile
import requests
from pathlib import Path
from typing import List, Optional, Dict, Any

from src.config import DOMAIN
from src.data.provenance import (
    write_provenance_sidecar,
    verify_provenance_integrity,
    MissingDataError,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_BERGS_DIR = PROJECT_ROOT / DOMAIN["paths"]["raw_data"] / "bergs"

BYU_BASE_URL = "https://www.scp.byu.edu/data/iceberg"
BYU_CONSOLIDATED_URL = f"{BYU_BASE_URL}/consolidated_database_v8.0.zip"
BYU_STATISTICAL_URL = f"{BYU_BASE_URL}/stats_database_v7.1.zip"
USNIC_CSV_URL = "https://usicecenter.gov/pub/Iceberg_Tabular.csv"

BYU_CITATION = "Budge, J. S., & Long, D. G. (2018). BYU Antarctic Iceberg Tracking Database. BYU Center for Remote Sensing."
NIC_CITATION = "U.S. National Ice Center (USNIC). Antarctic Iceberg Tracking Database."


def fetch_byu_iceberg_database(
    output_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> Dict[str, Path]:
    """
    Download and extract the BYU Antarctic Iceberg Tracking Database.
    Generates provenance sidecars with SHA-256 validation.
    """
    dest_dir = Path(output_dir) if output_dir else RAW_BERGS_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    targets = {
        "consolidated": ("consolidated_database_v8.0.zip", BYU_CONSOLIDATED_URL, "BYU Consolidated Database v8.0"),
        "statistical": ("stats_database_v7.1.zip", BYU_STATISTICAL_URL, "BYU Statistical Database v7.1"),
    }
    results = {}

    for key, (fname, url, name) in targets.items():
        zip_path = dest_dir / fname
        
        # Check if existing consolidated database zip exists with versioned name
        if not zip_path.exists() and key == "consolidated":
            alt = dest_dir / "consolidated_database_v8.0.zip"
            if alt.exists():
                zip_path = alt

        if not zip_path.exists() or overwrite:
            print(f"Downloading {name} from {url}...")
            try:
                resp = requests.get(url, timeout=60, stream=True)
                resp.raise_for_status()
                with open(zip_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=65536):
                        f.write(chunk)
            except Exception as e:
                if not zip_path.exists():
                    raise MissingDataError(f"Failed to download {name}: {e}")

        # Extract
        extract_dir = dest_dir / f"{key}_extracted"
        if not extract_dir.exists() or overwrite:
            print(f"Extracting {zip_path.name} to {extract_dir.name}...")
            extract_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(extract_dir)

        # Write provenance for the zip archive
        write_provenance_sidecar(
            filepath=zip_path,
            source_name=name,
            source_url=url,
            product_version="v8.0",
            doi_or_citation="https://doi.org/10.1109/JSTARS.2017.2758223",
            spatial_coverage={"region": "Antarctic / Southern Ocean", "projection": "WGS84"},
            temporal_coverage={"start": "1978-01-01", "end": "present"},
            variables=["iceberg_id", "date", "latitude", "longitude", "length_km", "width_km", "rotation_deg"],
            extra_metadata={"citation": BYU_CITATION},
        )
        results[key] = zip_path

    return results


def fetch_nic_weekly_icebergs(
    output_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> Path:
    """Download current operational US NIC weekly Antarctic iceberg positions CSV."""
    dest_dir = Path(output_dir) if output_dir else RAW_BERGS_DIR / "nic"
    dest_dir.mkdir(parents=True, exist_ok=True)
    target_path = dest_dir / "nic_antarctic_icebergs.csv"

    if target_path.exists() and not overwrite:
        try:
            verify_provenance_integrity(target_path)
            return target_path
        except Exception:
            pass

    print(f"Downloading US NIC weekly iceberg positions...")
    try:
        resp = requests.get(USNIC_CSV_URL, timeout=30)
        resp.raise_for_status()
        target_path.write_bytes(resp.content)
    except Exception as e:
        if not target_path.exists():
            raise MissingDataError(f"Failed to download US NIC icebergs: {e}")

    write_provenance_sidecar(
        filepath=target_path,
        source_name="US National Ice Center Weekly Antarctic Icebergs",
        source_url=USNIC_CSV_URL,
        product_version="USNIC_weekly",
        doi_or_citation="https://usicecenter.gov/Products/AntarcIcebergs",
        spatial_coverage={"region": "Antarctic", "projection": "WGS84"},
        temporal_coverage={"period": "weekly_operational"},
        variables=["iceberg_name", "latitude", "longitude", "size_nm", "date"],
        extra_metadata={"citation": NIC_CITATION},
    )

    return target_path


if __name__ == "__main__":
    fetch_byu_iceberg_database()
    try:
        fetch_nic_weekly_icebergs()
    except Exception as e:
        print(f"Note on NIC download: {e}")
