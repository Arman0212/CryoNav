"""
Dump one real response per API endpoint into web/fixtures/.

Why: the frontend developer should never be blocked on having the 5.4 GB Zarr
cube, a trained model, or a running backend. These files are the frozen shape
of every endpoint — build the UI against them, then flip to the live API.

Run:  PYTHONPATH=. python scripts/dump_fixtures.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.config import get_project_root

FIXTURE_DIR = get_project_root() / "web" / "fixtures"

# name -> (method, path, json body for POST)
ENDPOINTS = [
    ("config",     "GET",  "/config", None),
    ("demo-dates", "GET",  "/demo-dates", None),
    ("forecast",   "GET",  "/forecast?date=2023-01-13&lead=7", None),
    ("observed",   "GET",  "/observed?date=2023-01-20", None),
    ("bergs",      "GET",  "/bergs?date=2023-01-20&horizon=7", None),
    ("metrics",    "GET",  "/metrics", None),
    ("route",      "POST", "/route", {
        "origin": "cape_town",
        "destination": "bharati",
        "depart_date": "2023-01-13",
        "w_time": 1.0,
        "w_fuel": 0.5,
        "w_risk": 2.0,
    }),
]

# Full float precision triples the file size and buys the map nothing —
# SIC is [0,1] and lat/lon at 3 dp is ~100 m.
PRECISION = 3


def shrink(obj):
    if isinstance(obj, float):
        return round(obj, PRECISION)
    if isinstance(obj, list):
        return [shrink(v) for v in obj]
    if isinstance(obj, dict):
        return {k: shrink(v) for k, v in obj.items()}
    return obj


def main():
    from fastapi.testclient import TestClient
    from src.api.main import app

    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    written, failed = [], []

    # Context manager form so the startup event (Zarr load) actually runs.
    with TestClient(app) as client:
        for name, method, path, body in ENDPOINTS:
            try:
                res = (client.get(path) if method == "GET"
                       else client.post(path, json=body))
                if res.status_code != 200:
                    failed.append((name, f"HTTP {res.status_code}: {res.text[:120]}"))
                    continue
                out = FIXTURE_DIR / f"{name}.json"
                out.write_text(json.dumps(shrink(res.json()), separators=(",", ":")))
                written.append((name, path, out.stat().st_size / 1e6))
            except Exception as e:
                failed.append((name, f"{type(e).__name__}: {e}"))

    print(f"\nFixtures -> {FIXTURE_DIR}")
    for name, path, mb in written:
        print(f"  ok    {name + '.json':<18} {mb:6.2f} MB   {path}")
    for name, err in failed:
        print(f"  FAIL  {name + '.json':<18} {err}")
    print(f"\n{len(written)} written, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
