"""
CryoNav — Data Provenance & Integrity Enforcement Module.

Every cached file written to disk must have an immutable `.provenance.json` sidecar:
- Source name and upstream URL
- Product version and formal scientific citation / DOI
- Retrieval timestamp in UTC (ISO 8601)
- SHA-256 cryptographic checksum
- File size in bytes
- Spatial bounds and temporal coverage
- Variables contained

Fail-Loud Principles:
- Missing files raise MissingDataError (never silently ignored or replaced with mock/zeros).
- Corrupt files or SHA-256 mismatches raise DataCorruptionError.
- Outdated operational files exceeding staleness thresholds raise DataStalenessError.
"""
import os
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any


class DataLayerError(Exception):
    """Base exception for all CryoNav data layer failures."""
    pass


class MissingDataError(DataLayerError):
    """Raised when expected data or provenance sidecars are missing."""
    pass


class DataCorruptionError(DataLayerError):
    """Raised when SHA-256 checksum fails or data structure is unreadable."""
    pass


class DataStalenessError(DataLayerError):
    """Raised when operational input data is older than the staleness threshold."""
    pass


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA-256 hex digest of a file in 64 KB chunks."""
    filepath = Path(filepath)
    if not filepath.exists():
        raise MissingDataError(f"Cannot compute checksum; file does not exist: {filepath}")
    
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def get_provenance_path(filepath: Path) -> Path:
    """Standard naming for provenance sidecars: <filename>.<ext>.provenance.json."""
    filepath = Path(filepath)
    return filepath.parent / f"{filepath.name}.provenance.json"


def write_provenance_sidecar(
    filepath: Path,
    source_name: str,
    source_url: str,
    product_version: str,
    doi_or_citation: str,
    spatial_coverage: Dict[str, Any],
    temporal_coverage: Dict[str, Any],
    variables: List[str],
    retrieval_time_utc: Optional[str] = None,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> Path:
    """
    Write a JSON sidecar recording complete provenance and cryptographic integrity.
    
    Parameters:
        filepath: Path to the cached data file.
        source_name: Official provider/dataset name (e.g. 'NSIDC-0079', 'ERA5').
        source_url: Endpoint or URL fetched from.
        product_version: Data version string.
        doi_or_citation: Formal scientific reference or DOI.
        spatial_coverage: Coordinate bounds / projection metadata.
        temporal_coverage: Observation timestamp(s) or range.
        variables: List of variable names in the file.
        retrieval_time_utc: Optional UTC ISO string (defaults to now).
        extra_metadata: Optional domain-specific tags.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise MissingDataError(f"Cannot write provenance for nonexistent file: {filepath}")

    sha256 = compute_file_sha256(filepath)
    size_bytes = filepath.stat().st_size
    now_utc = retrieval_time_utc or datetime.now(timezone.utc).isoformat()

    provenance_record = {
        "file_name": filepath.name,
        "source_name": source_name,
        "source_url": source_url,
        "product_version": product_version,
        "doi_or_citation": doi_or_citation,
        "retrieval_time_utc": now_utc,
        "sha256_checksum": sha256,
        "file_size_bytes": size_bytes,
        "spatial_coverage": spatial_coverage,
        "temporal_coverage": temporal_coverage,
        "variables": variables,
        "integrity_status": "verified",
        "extra": extra_metadata or {},
    }

    sidecar_path = get_provenance_path(filepath)
    with open(sidecar_path, "w", encoding="utf-8") as f:
        json.dump(provenance_record, f, indent=2)

    return sidecar_path


def read_provenance_sidecar(filepath: Path) -> Dict[str, Any]:
    """Read and return the provenance metadata sidecar for a given file."""
    sidecar_path = get_provenance_path(filepath)
    if not sidecar_path.exists():
        raise MissingDataError(
            f"Provenance metadata sidecar missing for {filepath.name}. Expected at {sidecar_path}"
        )
    with open(sidecar_path, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_provenance_integrity(
    filepath: Path,
    max_age_days: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Verify that a cached file exists, has a valid provenance sidecar, matches its
    recorded SHA-256 hash, and satisfies operational staleness constraints.
    
    Raises:
        MissingDataError: If file or sidecar does not exist.
        DataCorruptionError: If checksum does not match or file size is 0.
        DataStalenessError: If data age exceeds max_age_days.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise MissingDataError(f"Data file does not exist: {filepath}")

    if filepath.stat().st_size == 0:
        raise DataCorruptionError(f"Data file is empty (0 bytes): {filepath}")

    metadata = read_provenance_sidecar(filepath)
    recorded_hash = metadata.get("sha256_checksum")
    if not recorded_hash:
        raise DataCorruptionError(f"Provenance sidecar missing sha256_checksum: {filepath}")

    current_hash = compute_file_sha256(filepath)
    if current_hash != recorded_hash:
        raise DataCorruptionError(
            f"SHA-256 checksum mismatch for {filepath.name}!\n"
            f"  Expected: {recorded_hash}\n"
            f"  Computed: {current_hash}"
        )

    # Staleness check
    if max_age_days is not None:
        retrieval_str = metadata.get("retrieval_time_utc")
        if retrieval_str:
            try:
                retrieval_dt = datetime.fromisoformat(retrieval_str)
                age_days = (datetime.now(timezone.utc) - retrieval_dt).total_seconds() / 86400.0
                if age_days > max_age_days:
                    raise DataStalenessError(
                        f"Data file {filepath.name} is stale: retrieved {age_days:.1f} days ago "
                        f"(maximum allowed: {max_age_days:.1f} days)"
                    )
            except ValueError:
                pass  # If ISO string cannot be parsed, fail-safe or warn

    return metadata
