"""
CryoNav — FastAPI backend.

Endpoints:
  GET  /grid                         -> static grid (lat/lon/land_mask), fetch once
  GET  /forecast?date=...&lead=...   -> forecast SIC field + stats
  GET  /observed?date=...            -> observed SIC for overlay proof
  GET  /bergs?date=...&horizon=...   -> berg tracks + ensemble ellipses
  POST /route                        -> routes with metrics + rejection reasons
  GET  /metrics                      -> validation tables
  GET  /config                       -> domain configuration for frontend
  GET  /demo-dates                   -> available demo dates
"""
import numpy as np
import xarray as xr
import json
from pathlib import Path
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, ROUTING
from src.ice.predict import load_cached_forecast, lead_index

app = FastAPI(title="CryoNav API", version="1.0.0",
              description="Antarctic Sea-Ice, Iceberg & Navigation Decision Support")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals — loaded on startup
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ZARR_PATH = str(PROJECT_ROOT / DOMAIN["paths"]["zarr_cube"])
BERG_CSV = PROJECT_ROOT / "data" / "processed" / "bergs" / "tracked_icebergs_2017_2024.csv"
DS = None
BERGS = None          # observed berg tracks, or None if the file is absent
CACHE = {}            # memoised berg propagations, keyed by (date, horizon, limit)


@app.on_event("startup")
async def startup():
    global DS, BERGS
    try:
        DS = xr.open_zarr(ZARR_PATH)
        print(f"Loaded Zarr cube: {ZARR_PATH}")
        print(f"  Time range: {DS.time.values[0]} to {DS.time.values[-1]}")
        print(f"  Grid: {DS.dims}")
    except Exception as e:
        print(f"Warning: Could not load Zarr cube: {e}")
        print("  Field endpoints will return 404 until a cube exists.")
        print("  Build one with: python src/data/synthetic.py --quick")

    try:
        import pandas as pd
        BERGS = pd.read_csv(BERG_CSV, parse_dates=["date"])
        print(f"Loaded {len(BERGS):,} berg observations "
              f"({BERGS.berg_id.nunique()} bergs) from {BERG_CSV.name}")
    except Exception as e:
        print(f"Warning: no observed berg tracks ({type(e).__name__}); "
              f"/bergs will fall back to synthetic positions.")


def _observed_at(date_str):
    """Observed SIC field nearest to date_str, plus the date actually used."""
    idx = int(np.argmin(np.abs(DS.time.values - np.datetime64(date_str))))
    return DS["sic"].values[idx], str(np.datetime64(DS.time.values[idx], "D"))


def _field_stats(field, ocean):
    return {
        "mean_sic": float(np.mean(field[ocean])),
        "ice_extent_cells": int(np.sum((field > 0.15) & ocean)),
        "ice_area_km2": int(np.sum((field > 0.15) & ocean) * 625),
    }


@app.get("/config")
async def get_config():
    """Return domain configuration for the frontend."""
    return {
        "region": DOMAIN["region"],
        "stations": DOMAIN["stations"],
        "origins": DOMAIN["origins"],
        "held_out_demo_dates": DOMAIN["held_out_demo_dates"],
        "forecast_horizon_days": DOMAIN["time"]["forecast_horizon_days"],
        "ship": DOMAIN["ship"],
        "routing_weights": ROUTING["cost_weights"],
        "alternative_profiles": {k: v["name"] for k, v in 
                                 ROUTING["alternatives"]["profiles"].items()},
    }


@app.get("/demo-dates")
async def get_demo_dates():
    """Return available dates for the demo."""
    if DS is None:
        return {"dates": DOMAIN["held_out_demo_dates"]}
    
    times = [str(np.datetime64(t, 'D')) for t in DS.time.values]
    return {
        "all_dates": times,
        "demo_dates": DOMAIN["held_out_demo_dates"],
        "range": {"start": times[0], "end": times[-1]},
    }


@app.get("/grid")
async def get_grid():
    """
    Static grid geometry: lat, lon and land mask.

    These never change, so they are served here once instead of being repeated
    in every /forecast response (which the lead-day animation calls 14 times).
    """
    if DS is None:
        raise HTTPException(404, "Data not loaded")

    return {
        "shape": list(DS["lat"].values.shape),
        "lat": DS["lat"].values.tolist(),
        "lon": DS["lon"].values.tolist(),
        "land_mask": DS["land_mask"].values.tolist(),
        "cell_size_km": 25,
    }


@app.get("/forecast")
async def get_forecast(date: str, lead: int = 7):
    """
    Model forecast initialized on `date`, valid at `date + lead` days.

    `date` is the initialization date: the last day of observed data the model
    was shown. The returned field is the U-Net's prediction, loaded from the
    forecast cache written by src/ice/predict.py.

    If no cached forecast exists for `date`, the response falls back to the
    OBSERVED field at the valid date and says so in `source`. That fallback is
    not a forecast — it is the answer — so callers must surface it rather than
    plot it as a prediction.

    Grid arrays are not included; fetch /grid once instead.
    """
    if DS is None:
        raise HTTPException(404, "Data not loaded")

    horizon = DOMAIN["time"]["forecast_horizon_days"]
    if not 1 <= lead <= horizon:
        raise HTTPException(400, f"lead must be in 1..{horizon}, got {lead}")

    init_dt = np.datetime64(date)
    valid_dt = init_dt + np.timedelta64(lead, "D")
    if not (DS.time.values[0] <= valid_dt <= DS.time.values[-1]):
        raise HTTPException(400, f"Valid date {valid_dt} is outside the cube")

    cached = load_cached_forecast(date, ZARR_PATH)
    if cached is not None and lead <= cached.shape[0]:
        sic = cached[lead - 1]
        source = "model"
        warning = None
    else:
        sic, _ = _observed_at(str(valid_dt))
        source = "observed_fallback"
        warning = (f"No cached forecast for init date {date}. Returning OBSERVED "
                   f"SIC at {valid_dt}, which is truth, not a prediction. "
                   f"Generate one with: python src/ice/predict.py --dates {date}")

    ocean = DS["land_mask"].values < 0.5
    stats = {
        "init_date": date,
        "valid_date": str(np.datetime64(valid_dt, "D")),
        "lead_day": lead,
        "source": source,
        **_field_stats(sic, ocean),
    }

    return {
        "sic": sic.tolist(),
        "shape": list(sic.shape),
        "source": source,
        "warning": warning,
        "stats": stats,
    }


@app.get("/observed")
async def get_observed(date: str):
    """Get observed (actual) SIC field for overlay proof."""
    if DS is None:
        raise HTTPException(404, "Data not loaded")
    
    try:
        target_dt = np.datetime64(date)
        idx = int(np.argmin(np.abs(DS.time.values - target_dt)))
        
        sic = DS["sic"].values[idx]
        land_mask = DS["land_mask"].values
        
        ocean = land_mask < 0.5
        
        return {
            "sic": sic.tolist(),
            "shape": list(sic.shape),
            "date": str(np.datetime64(DS.time.values[idx], 'D')),
            "stats": {
                "mean_sic": float(np.mean(sic[ocean])),
                "ice_extent_km2": int(np.sum((sic > 0.15) & ocean) * 625),
            }
        }
    except Exception as e:
        raise HTTPException(500, str(e))


def _grid_tree():
    """KD-tree over grid cells for fast nearest-cell lookup during drift."""
    if "tree" not in CACHE:
        from scipy.spatial import cKDTree
        lat = DS["lat"].values
        lon = DS["lon"].values
        # Scale longitude by cos(lat) so "nearest" is not biased toward latitude.
        pts = np.column_stack([
            (lon * np.cos(np.radians(lat))).ravel(),
            lat.ravel(),
        ])
        CACHE["tree"] = (cKDTree(pts), lat.shape)
    return CACHE["tree"]


def _forcing_from_cube(date: str, horizon: int):
    """
    Build a forcing_func sampling real winds, currents and SIC from the cube.

    Replaces the hardcoded sinusoid the demo used to drift bergs with. Fields
    for the whole window are pulled into memory once; the drift integrator then
    only does an array lookup per step.
    """
    tree, shape = _grid_tree()
    i0 = int(np.argmin(np.abs(DS.time.values - np.datetime64(date))))
    i1 = min(i0 + horizon + 1, len(DS.time.values))

    fields = {}
    for name, var in [("wind_u", "u10"), ("wind_v", "v10"),
                      ("curr_u", "uo"), ("curr_v", "vo"), ("sic", "sic")]:
        if var in DS:
            fields[name] = DS[var].isel(time=slice(i0, i1)).values
    n_t = len(next(iter(fields.values())))

    def forcing_func(t_day, lat, lon):
        ti = min(int(t_day), n_t - 1)
        _, flat_idx = tree.query([lon * np.cos(np.radians(lat)), lat])
        yi, xi = np.unravel_index(flat_idx, shape)
        out = {k: float(v[ti, yi, xi]) for k, v in fields.items()}
        out.setdefault("curr_u", 0.0)
        out.setdefault("curr_v", 0.0)
        # zos gradients are not yet wired; the momentum balance treats the
        # missing pressure-gradient term as zero.
        out["ssh_grad_x"] = 0.0
        out["ssh_grad_y"] = 0.0
        return out

    return forcing_func


def _bergs_near_date(date: str, limit: int, days_tol: int = 7):
    """
    Observed bergs present on `date`, largest first.

    Returns (list_of_bergs, source). Falls back to synthetic positions only if
    the tracked-iceberg file was not loaded at startup.
    """
    from src.berg.risk_field import generate_synthetic_bergs_for_demo

    if BERGS is None:
        return generate_synthetic_bergs_for_demo(n_bergs=limit), "synthetic"

    import pandas as pd
    target = pd.Timestamp(date)
    # Nearest observation per berg within a week of the requested date.
    window = BERGS[(BERGS["date"] - target).abs() <= pd.Timedelta(days=days_tol)]
    if window.empty:
        return generate_synthetic_bergs_for_demo(n_bergs=limit), "synthetic"

    window = window.assign(_gap=(window["date"] - target).abs())
    nearest = window.sort_values("_gap").groupby("berg_id", as_index=False).first()

    defaults = ROUTING["berg_drift"]
    bergs = []
    for row in nearest.itertuples():
        length_km = getattr(row, "length_km", np.nan)
        width_km = getattr(row, "width_km", np.nan)
        bergs.append({
            "berg_id": row.berg_id,
            "lat": float(row.latitude),
            "lon": float(row.longitude),
            "length_m": (float(length_km) * 1000 if length_km == length_km
                         else defaults["default_length_m"]),
            "width_m": (float(width_km) * 1000 if width_km == width_km
                        else defaults["default_width_m"]),
            "observed_on": str(row.date.date()),
        })

    bergs.sort(key=lambda b: b["length_m"] * b["width_m"], reverse=True)
    return bergs[:limit], "observed"


def _propagate_bergs(date: str, horizon: int, limit: int):
    """Propagate bergs from `date`, memoised — /bergs and /route share this."""
    key = ("bergs", date, horizon, limit)
    if key in CACHE:
        return CACHE[key]

    from src.berg.dynamics import propagate

    bergs, source = _bergs_near_date(date, limit)
    forcing_func = _forcing_from_cube(date, horizon)
    n_ensemble = ROUTING["berg_drift"]["n_ensemble"]

    results = []
    for berg in bergs:
        result = propagate(
            berg["berg_id"], berg["lat"], berg["lon"],
            t0=date, horizon_days=horizon,
            forcing_func=forcing_func,
            berg_length=berg["length_m"],
            berg_width=berg["width_m"],
            method="2pct", n_ensemble=n_ensemble,
        )
        result["length_m"] = berg["length_m"]
        result["width_m"] = berg["width_m"]
        result["observed_on"] = berg.get("observed_on")
        results.append(result)

    CACHE[key] = (results, source, n_ensemble)
    return CACHE[key]


@app.get("/bergs")
async def get_bergs(date: str = "2023-01-13", horizon: int = 7, limit: int = 8):
    """
    Iceberg drift forecasts from `date`, with ensemble spread.

    Positions come from the tracked-iceberg record and are drifted with winds,
    currents and SIC read from the data cube.
    """
    if DS is None:
        raise HTTPException(404, "Data not loaded")

    horizon = max(1, min(horizon, DOMAIN["time"]["forecast_horizon_days"]))
    results, source, n_ensemble = _propagate_bergs(date, horizon, limit)

    return {
        "bergs": [{
            "berg_id": r["berg_id"],
            "mean_track": r["mean_track"],
            "ensemble": r["ensemble"].tolist(),
            "length_m": r["length_m"],
            "width_m": r["width_m"],
            "observed_on": r["observed_on"],
        } for r in results],
        "date": date,
        "horizon": horizon,
        "source": source,
        "n_ensemble": n_ensemble,
    }


class RouteRequest(BaseModel):
    origin: str = "cape_town"
    destination: str = "bharati"
    depart_date: str = "2023-01-13"
    w_time: float = 1.0
    w_fuel: float = 0.5
    w_risk: float = 2.0
    berg_limit: int = 8


@app.post("/route")
async def compute_route(req: RouteRequest):
    """
    Compute routes with all alternatives, metrics, and rejection reasons.
    """
    if DS is None:
        raise HTTPException(404, "Data not loaded")
    
    from src.routing.alternatives import generate_alternatives, format_comparison_for_display
    
    # Get origin/destination grid coordinates
    lat_grid = DS["lat"].values
    lon_grid = DS["lon"].values
    
    # Resolve origin
    if req.origin in DOMAIN["origins"]:
        origin = DOMAIN["origins"][req.origin]
    elif req.origin in DOMAIN["stations"]:
        origin = DOMAIN["stations"][req.origin]
    else:
        raise HTTPException(400, f"Unknown origin: {req.origin}")
    
    # Resolve destination
    if req.destination in DOMAIN["stations"]:
        dest = DOMAIN["stations"][req.destination]
    elif req.destination in DOMAIN["origins"]:
        dest = DOMAIN["origins"][req.destination]
    else:
        raise HTTPException(400, f"Unknown destination: {req.destination}")
    
    # Find nearest navigable ocean cells
    def find_approach(lat, lon, land_mask, bathy, sic_ref, max_sic=0.85):
        dist = (lat_grid - lat)**2 + (lon_grid - lon)**2
        navigable = (land_mask < 0.5) & (bathy < -15.0) & (sic_ref <= max_sic)
        dist[~navigable] = np.inf
        return tuple(int(x) for x in np.unravel_index(np.argmin(dist), dist.shape))
    
    depart_dt = np.datetime64(req.depart_date)
    today_idx = int(np.argmin(np.abs(DS.time.values - depart_dt)))
    sic_today = DS["sic"].values[today_idx]
    
    bathy = DS["bathy"].values
    land_mask = DS["land_mask"].values
    
    start_yx = find_approach(origin["lat"], origin["lon"], land_mask, bathy, sic_today)
    goal_yx = find_approach(dest["lat"], dest["lon"], land_mask, bathy, sic_today)
    
    # Get SIC fields for the forecast horizon
    horizon = DOMAIN["time"]["forecast_horizon_days"]
    
    # Route across the model's forecast, initialized on the departure date.
    # sic_fields[d] is the field the ship meets on day d+1 of the passage.
    cached = load_cached_forecast(req.depart_date, ZARR_PATH)
    if cached is not None:
        sic_fields = cached[:horizon]
        forecast_source = "model"
    else:
        sic_fields = np.stack([
            DS["sic"].values[int(np.argmin(np.abs(
                DS.time.values - (depart_dt + np.timedelta64(d + 1, "D")))))]
            for d in range(horizon)
        ], axis=0)
        forecast_source = "observed_fallback"

    # Berg risk the router actually consumes: probability of berg presence per
    # cell per day, from the same ensemble drift /bergs serves.
    try:
        from src.berg.risk_field import compute_risk_field
        berg_results, berg_source, _ = _propagate_bergs(
            req.depart_date, horizon, req.berg_limit)
        berg_risk = compute_risk_field(
            berg_results, lat_grid, lon_grid, horizon_days=horizon)
    except Exception as e:
        print(f"  Berg risk unavailable ({type(e).__name__}: {e}); using zeros.")
        berg_risk = np.zeros_like(sic_fields)
        berg_source = "unavailable"
    
    # Generate alternatives
    routes, comparison, rejections = generate_alternatives(
        sic_fields=sic_fields,
        berg_risk_field=berg_risk,
        bathy=bathy,
        land_mask=land_mask,
        lat_grid=lat_grid,
        lon_grid=lon_grid,
        start_yx=start_yx,
        goal_yx=goal_yx,
        sic_today=sic_today,
        # RouteRequest accepts w_time/w_fuel/w_risk and they were then dropped:
        # every profile used its configured weights from routing.yaml, so the
        # UI's POLARIS sliders changed nothing (w_risk=0 and w_risk=20 returned
        # byte-identical routes). Apply them to "balanced", the profile those
        # sliders are documented as tuning; the others keep their configured
        # weights so they stay a stable comparison.
        weight_overrides={"balanced": {
            "w_time": req.w_time, "w_fuel": req.w_fuel, "w_risk": req.w_risk,
        }},
    )
    
    # Serialize routes for JSON
    serialized_routes = {}
    for name, route in routes.items():
        serialized_routes[name] = {
            "profile_name": route.get("profile_name", name),
            "success": route["success"],
            "path_latlon": route.get("path_latlon_smooth", route.get("path_latlon", [])),
            "distance_nm": route.get("distance_nm", 0),
            "time_h": route.get("time_h", 0),
            "fuel_t": route.get("fuel_t", 0),
            "ice_hours_03": route.get("ice_hours_03", 0),
            "ice_hours_07": route.get("ice_hours_07", 0),
            "max_berg_risk": route.get("max_berg_risk", 0),
        }
    
    display = format_comparison_for_display(comparison, rejections)
    
    return {
        "routes": serialized_routes,
        "comparison": display,
        "forecast_source": forecast_source,
        "berg_source": berg_source,
        "origin": {"name": origin.get("name", req.origin), 
                   "lat": origin["lat"], "lon": origin["lon"]},
        "destination": {"name": dest.get("name", req.destination),
                       "lat": dest["lat"], "lon": dest["lon"]},
        "depart_date": req.depart_date,
    }


@app.get("/metrics")
async def get_metrics():
    """Return validation metrics (baselines, model skill)."""
    results_dir = PROJECT_ROOT / "results"
    
    metrics = {}
    
    # Load baselines CSV if it exists
    baselines_path = results_dir / "baselines.csv"
    if baselines_path.exists():
        import csv
        with open(baselines_path) as f:
            reader = csv.DictReader(f)
            baselines = list(reader)
        metrics["baselines"] = baselines
    
    # Load training history if it exists
    history_path = results_dir / "checkpoints" / "training_history.json"
    if history_path.exists():
        with open(history_path) as f:
            metrics["training_history"] = json.load(f)
    
    # Load skill vs lead plot path
    skill_plot = results_dir / "skill_vs_lead.png"
    metrics["skill_plot_available"] = skill_plot.exists()
    
    return metrics


# Serve static files (web frontend)
web_dir = PROJECT_ROOT / "web"
if web_dir.exists():
    app.mount("/static", StaticFiles(directory=str(web_dir)), name="static")


@app.get("/")
async def root():
    """Serve the frontend."""
    index_path = PROJECT_ROOT / "web" / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "CryoNav API is running. Frontend not yet built."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
