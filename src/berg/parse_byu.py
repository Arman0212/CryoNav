"""
CryoNav — Parse BYU/NIC Antarctic Iceberg Tracking Database.

Parses BYU v8.0 consolidated CSV files:
- Converts YYYYDDD dates to standard YYYY-MM-DD
- Extracts consensus position (lat, lon) prioritizing high-resolution scatterometers (ASCAT, OSCAT, QSCAT) and NIC
- Extracts iceberg size dimensions (length, width)
- Filters by temporal range and Indian Ocean domain
- Outputs clean tabular tracks for validation and real-time initialization
"""
import re
import glob
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN

RAW_BERGS_DIR = Path(__file__).resolve().parent.parent.parent / DOMAIN["paths"]["raw_data"] / "bergs" / "consolidated_v8" / "updated7_consol"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "data/processed/bergs"


def yyyyddd_to_date(val: int) -> Optional[datetime.date]:
    """Convert integer date YYYYDDD (e.g. 2023015) to datetime.date."""
    try:
        s = str(int(val))
        if len(s) != 7:
            return None
        year = int(s[:4])
        doy = int(s[4:])
        return (datetime(year, 1, 1) + timedelta(days=doy - 1)).date()
    except Exception:
        return None


# Priority order of sensors for position estimation
SENSOR_PRIORITY = ["ascat", "oscat", "qscat", "seawinds", "sass", "nic"]


def parse_berg_file(filepath: Path) -> pd.DataFrame:
    """
    Parse a single BYU consolidated iceberg CSV file into a clean trajectory DataFrame.
    """
    try:
        df = pd.read_csv(filepath)
    except Exception:
        return pd.DataFrame()

    if "date" not in df.columns:
        return pd.DataFrame()

    berg_id = filepath.stem.upper()

    # Parse dates
    dates = [yyyyddd_to_date(d) for d in df["date"].values]
    valid_date_mask = [d is not None for d in dates]
    df = df.iloc[valid_date_mask].copy()
    df["date"] = [d for d in dates if d is not None]

    # Find position from highest-priority available sensor for each day
    lats = np.full(len(df), np.nan, dtype=np.float64)
    lons = np.full(len(df), np.nan, dtype=np.float64)
    sensors = [""] * len(df)

    for sensor in SENSOR_PRIORITY:
        col_lat = f"{sensor}_1"
        col_lon = f"{sensor}_2"
        col_flag = f"{sensor}_3"

        if col_lat in df.columns and col_lon in df.columns:
            flag = df[col_flag].values if col_flag in df.columns else np.ones(len(df))
            s_lat = df[col_lat].values
            s_lon = df[col_lon].values

            # Valid if non-zero lat and flag >= 1
            valid = (s_lat != 0.0) & (~np.isnan(s_lat)) & (flag >= 1) & (np.isnan(lats))
            lats[valid] = s_lat[valid]
            lons[valid] = s_lon[valid]
            for idx in np.where(valid)[0]:
                sensors[idx] = sensor

    # Fallback to any remaining columns with _1 and _2
    if np.isnan(lats).any():
        for col in df.columns:
            if col.endswith("_1") and not col.startswith("size"):
                prefix = col[:-2]
                col_lon = f"{prefix}_2"
                if col_lon in df.columns:
                    s_lat = df[col].values
                    s_lon = df[col_lon].values
                    valid = (s_lat != 0.0) & (~np.isnan(s_lat)) & (np.isnan(lats))
                    lats[valid] = s_lat[valid]
                    lons[valid] = s_lon[valid]
                    for idx in np.where(valid)[0]:
                        sensors[idx] = prefix

    # Extract size if available (in km / nautical miles)
    length_km = np.full(len(df), np.nan)
    width_km = np.full(len(df), np.nan)
    if "size_1" in df.columns:
        length_km = df["size_1"].replace(0, np.nan).values * 1.852  # NM -> km
    if "size_2" in df.columns:
        width_km = df["size_2"].replace(0, np.nan).values * 1.852

    # Build clean output
    out = pd.DataFrame({
        "berg_id": berg_id,
        "date": df["date"].values,
        "latitude": lats,
        "longitude": lons,
        "sensor": sensors,
        "length_km": length_km,
        "width_km": width_km,
    })

    # Drop rows without valid positions
    out = out.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)
    return out


def parse_all_bergs(
    start_date: str = "2017-01-01",
    end_date: str = "2024-12-31",
    in_domain_only: bool = True
) -> pd.DataFrame:
    """
    Parse all BYU consolidated iceberg files and return a unified DataFrame.
    """
    files = sorted(RAW_BERGS_DIR.glob("*.csv"))
    if not files:
        print(f"No berg CSV files found in {RAW_BERGS_DIR}")
        return pd.DataFrame()

    print(f"Parsing {len(files)} BYU iceberg trajectory files...")

    t_min = datetime.strptime(start_date, "%Y-%m-%d").date()
    t_max = datetime.strptime(end_date, "%Y-%m-%d").date()

    lon_min = DOMAIN["region"]["lon_min"]
    lon_max = DOMAIN["region"]["lon_max"]
    lat_min = DOMAIN["region"]["lat_min"]
    lat_max = DOMAIN["region"]["lat_max"]

    records = []
    for f in files:
        df_berg = parse_berg_file(f)
        if df_berg.empty:
            continue

        # Filter by date range
        df_berg = df_berg[(df_berg["date"] >= t_min) & (df_berg["date"] <= t_max)]
        if df_berg.empty:
            continue

        if in_domain_only:
            in_box = (
                (df_berg["latitude"] >= lat_min) & (df_berg["latitude"] <= lat_max) &
                (df_berg["longitude"] >= lon_min) & (df_berg["longitude"] <= lon_max)
            )
            # Keep berg if at least one observation is in the domain
            if not in_box.any():
                continue

        records.append(df_berg)

    if not records:
        print("No berg observations found matching criteria.")
        return pd.DataFrame()

    unified = pd.concat(records, ignore_index=True)
    unified = unified.sort_values(["berg_id", "date"]).reset_index(drop=True)

    print(f"✓ Parsed {unified['berg_id'].nunique()} distinct icebergs ({len(unified)} total daily observations)")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_csv = OUTPUT_DIR / "tracked_icebergs_2017_2024.csv"
    out_parquet = OUTPUT_DIR / "tracked_icebergs_2017_2024.parquet"
    
    unified.to_csv(out_csv, index=False)
    unified.to_parquet(out_parquet, index=False)
    print(f"✓ Saved to {out_csv} and {out_parquet}")

    return unified


if __name__ == "__main__":
    df = parse_all_bergs(start_date="2017-01-01", end_date="2024-12-31", in_domain_only=True)
