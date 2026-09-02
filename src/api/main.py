"""
CryoNav — FastAPI backend.

Endpoints:
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
DS = None
CACHE = {}


@app.on_event("startup")
async def startup():
    global DS
    try:
        DS = xr.open_zarr(ZARR_PATH)
        print(f"Loaded Zarr cube: {ZARR_PATH}")
        print(f"  Time range: {DS.time.values[0]} to {DS.time.values[-1]}")
        print(f"  Grid: {DS.dims}")
    except Exception as e:
        print(f"Warning: Could not load Zarr cube: {e}")
        print("  API will return synthetic demo data")


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


@app.get("/forecast")
async def get_forecast(date: str, lead: int = 7):
    """
    Get forecast SIC field for a given date and lead day.
    
    In production: runs the trained model.
    In demo mode: returns the SIC field at date + lead from the Zarr cube,
    simulating a forecast (since synthetic data has no model).
    """
    if DS is None:
        raise HTTPException(404, "Data not loaded")
    
    try:
        target_dt = np.datetime64(date)
        forecast_dt = target_dt + np.timedelta64(lead, 'D')
        
        # For demo: use actual data as "forecast" (the model would predict this)
        if forecast_dt > DS.time.values[-1] or forecast_dt < DS.time.values[0]:
            raise HTTPException(400, f"Date {forecast_dt} out of range")
        
        # Find nearest time
        idx = int(np.argmin(np.abs(DS.time.values - forecast_dt)))
        
        sic = DS["sic"].values[idx]
        land_mask = DS["land_mask"].values
        lat = DS["lat"].values
        lon = DS["lon"].values
        
        # Compute stats
        ocean = land_mask < 0.5
        stats = {
            "date": date,
            "lead_day": lead,
            "forecast_date": str(np.datetime64(DS.time.values[idx], 'D')),
            "mean_sic": float(np.mean(sic[ocean])),
            "ice_extent_cells": int(np.sum((sic > 0.15) & ocean)),
            "ice_area_km2": int(np.sum((sic > 0.15) & ocean) * 625),  # 25km² cells
        }
        
        # Return as flattened data for efficient transfer
        return {
            "sic": sic.tolist(),
            "shape": list(sic.shape),
            "lat": lat.tolist(),
            "lon": lon.tolist(),
            "land_mask": land_mask.tolist(),
            "stats": stats,
        }
    
    except Exception as e:
        raise HTTPException(500, str(e))


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


def _propagate_demo_bergs(date: str, horizon_days: int, n_bergs: int = 5):
    """
    Propagate the demo iceberg set, returning (berg, propagate_result) pairs.

    Shared by GET /bergs, which serialises the tracks for the map, and
    POST /route, which turns them into the berg-risk field the router
    consumes — so the bergs drawn on the map are the same ones the route
    is asked to avoid.
    """
    from src.berg.risk_field import generate_synthetic_bergs_for_demo
    from src.berg.dynamics import propagate

    def forcing_func(t_day, lat, lon):
        return {
            "wind_u": 5.0 + 2.0 * np.sin(t_day * 0.5),
            "wind_v": -3.0,
            "curr_u": 0.1,
            "curr_v": 0.02,
            "sic": max(0, 0.3 + 0.4 * ((-65 - lat) / 10)),
            "ssh_grad_x": 0.0,
            "ssh_grad_y": 0.0,
        }

    out = []
    for berg in generate_synthetic_bergs_for_demo(n_bergs=n_bergs):
        out.append((berg, propagate(
            berg["berg_id"], berg["lat"], berg["lon"],
            t0=date, horizon_days=min(horizon_days, 14),
            forcing_func=forcing_func,
            berg_length=berg["length_m"],
            berg_width=berg["width_m"],
            method="2pct", n_ensemble=10,
        )))
    return out


@app.get("/bergs")
async def get_bergs(date: str = "2023-01-20", horizon: int = 7):
    """Get iceberg tracks with ensemble positions."""
    results = [
        {
            "berg_id": result["berg_id"],
            "mean_track": result["mean_track"],
            "ensemble": result["ensemble"].tolist(),
            "length_m": berg["length_m"],
            "width_m": berg["width_m"],
        }
        for berg, result in _propagate_demo_bergs(date, horizon)
    ]

    return {"bergs": results, "date": date, "horizon": horizon}


class RouteRequest(BaseModel):
    origin: str = "cape_town"
    destination: str = "bharati"
    depart_date: str = "2023-01-13"
    w_time: float = 1.0
    w_fuel: float = 0.5
    w_risk: float = 2.0


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
    
    # Check for cached neural network forecast for this departure date
    cache_file = PROJECT_ROOT / "data" / "processed" / "demo_cache" / f"forecast_{req.depart_date}.npy"
    if cache_file.exists():
        sic_fields = np.load(cache_file)
    else:
        sic_fields = []
        for d in range(horizon):
            dt = depart_dt + np.timedelta64(d, 'D')
            idx = int(np.argmin(np.abs(DS.time.values - dt)))
            sic_fields.append(DS["sic"].values[idx])
        sic_fields = np.stack(sic_fields, axis=0)
    
    # Berg risk field, from the same demo bergs GET /bergs draws.
    # This was previously np.zeros_like(sic_fields), which made
    # max_berg_risk 0.00 on every profile and left the request's w_risk
    # weight with nothing to act on — "min ice" and "balanced" could only
    # ever differ by sea-ice cost. If propagation fails we fall back to
    # zeros rather than failing the whole route request.
    from src.berg.risk_field import compute_risk_field
    try:
        berg_tracks = [r for _, r in _propagate_demo_bergs(req.depart_date, horizon)]
        berg_risk = compute_risk_field(
            berg_tracks, lat_grid, lon_grid, horizon_days=horizon,
        ).astype(sic_fields.dtype, copy=False)
    except Exception as exc:  # pragma: no cover - defensive
        print(f"[route] berg propagation failed, falling back to zeros: {exc}")
        berg_risk = np.zeros_like(sic_fields)
    
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
        # The request's cost weights were previously accepted and then
        # ignored - every profile used its configured weights, so the UI's
        # POLARIS sliders changed nothing. Apply them to "balanced", which is
        # the profile those sliders are documented as tuning; the others stay
        # fixed so they remain a stable comparison.
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
