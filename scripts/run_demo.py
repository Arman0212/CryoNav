"""
CryoNav — End-to-end demo sequence.

Regenerates the entire winning four-beat sequence from the Zarr store,
with no manual steps. Writes PNGs + JSON of every number.

The four beats:
1. "Here is the input state (2023-01-13)."
2. "Here is the model's forecast for 2023-01-20."
3. "Here is what actually happened." + difference map + metrics
4. "Here is the route." + alternatives + rejection reasons + savings

Run: python scripts/run_demo.py
"""
import numpy as np
import xarray as xr
import json
from pathlib import Path
from datetime import datetime, timedelta
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.config import DOMAIN, ROUTING

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ZARR_PATH = str(PROJECT_ROOT / DOMAIN["paths"]["zarr_cube"])
RESULTS_DIR = PROJECT_ROOT / "results"
DEMO_DIR = RESULTS_DIR / "demo"


def run_demo(demo_date="2023-01-20", input_date="2023-01-13", 
             destination="bharati"):
    """Run the complete demo sequence for one held-out date."""
    
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print(f"  CryoNav Demo — {demo_date}")
    print(f"  Input state: {input_date}")
    print(f"  Destination: {destination}")
    print("=" * 70)
    
    # Load data
    ds = xr.open_zarr(ZARR_PATH)
    lat_grid = ds["lat"].values
    lon_grid = ds["lon"].values
    land_mask = ds["land_mask"].values
    bathy = ds["bathy"].values
    ocean_mask = ds["sic_mask"].values
    
    # ── BEAT 1: Input State ──
    print("\n🔹 Beat 1: Input state")
    input_dt = np.datetime64(input_date)
    input_idx = int(np.argmin(np.abs(ds.time.values - input_dt)))
    sic_input = ds["sic"].values[input_idx]
    
    beat1 = {
        "date": input_date,
        "mean_sic": float(np.mean(sic_input[ocean_mask > 0.5])),
        "ice_extent_km2": int(np.sum((sic_input > 0.15) & (ocean_mask > 0.5)) * 625),
        "message": f"Here is {input_date}. We show the model nothing after this date.",
    }
    print(f"  Mean SIC: {beat1['mean_sic']:.3f}")
    print(f"  Ice extent: {beat1['ice_extent_km2']:,} km²")
    
    # ── BEAT 2: Forecast ──
    print("\n🔹 Beat 2: Model forecast")
    lead_days = 7
    forecast_dt = input_dt + np.timedelta64(lead_days, 'D')
    forecast_idx = int(np.argmin(np.abs(ds.time.values - forecast_dt)))
    
    # The cached forecast is keyed by its init date -- the last day the model
    # saw -- and entry [i] is valid at init + (i+1) days. Index by the actual
    # gap to demo_date rather than assuming a fixed lead.
    from src.ice.predict import load_cached_forecast, lead_index

    sic_forecast_all = load_cached_forecast(input_date)
    li = lead_index(input_date, demo_date)
    if sic_forecast_all is not None and 0 <= li < sic_forecast_all.shape[0]:
        sic_forecast = sic_forecast_all[li]
        forecast_source = "model"
    else:
        sic_forecast_all = None
        sic_forecast = ds["sic"].values[forecast_idx]
        forecast_source = "observed_fallback"
        print(f"  WARNING: no cached forecast for init {input_date}; "
              f"beats 2-4 use OBSERVED data, not a prediction.")
    
    beat2 = {
        "forecast_date": str(np.datetime64(ds.time.values[forecast_idx], 'D')),
        "lead_days": lead_days,
        "mean_sic": float(np.mean(sic_forecast[ocean_mask > 0.5])),
        "ice_extent_km2": int(np.sum((sic_forecast > 0.15) & (ocean_mask > 0.5)) * 625),
        "source": forecast_source,
        "message": (f"Here is the model's forecast for {demo_date}."
                    if forecast_source == "model"
                    else f"NO CACHED FORECAST -- showing observed SIC for {demo_date}."),
    }
    print(f"  Forecast date: {beat2['forecast_date']}")
    print(f"  Mean SIC: {beat2['mean_sic']:.3f}")
    
    # ── BEAT 3: What actually happened ──
    print("\n🔹 Beat 3: Observation overlay")
    obs_dt = np.datetime64(demo_date)
    obs_idx = int(np.argmin(np.abs(ds.time.values - obs_dt)))
    sic_observed = ds["sic"].values[obs_idx]
    
    # Compute metrics
    diff = (sic_forecast - sic_observed) * ocean_mask
    rmse = float(np.sqrt(np.mean(diff**2)))
    mae = float(np.mean(np.abs(diff)))
    
    # IIEE
    forecast_ice = (sic_forecast >= 0.15) & (ocean_mask > 0.5)
    observed_ice = (sic_observed >= 0.15) & (ocean_mask > 0.5)
    iiee_over = int(np.sum(forecast_ice & ~observed_ice) * 625)
    iiee_under = int(np.sum(~forecast_ice & observed_ice) * 625)
    iiee_total = iiee_over + iiee_under
    
    # Binary F1 at 15%
    tp = np.sum(forecast_ice & observed_ice)
    fp = np.sum(forecast_ice & ~observed_ice)
    fn = np.sum(~forecast_ice & observed_ice)
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    
    beat3 = {
        "observed_date": str(np.datetime64(ds.time.values[obs_idx], 'D')),
        "rmse": rmse,
        "mae": mae,
        "iiee_total_km2": iiee_total,
        "iiee_over_km2": iiee_over,
        "iiee_under_km2": iiee_under,
        "f1_15pct": f1,
        "precision": precision,
        "recall": recall,
        "message": f"Here is what actually happened. RMSE={rmse:.4f}, IIEE={iiee_total:,} km²",
    }
    print(f"  RMSE: {beat3['rmse']:.4f}")
    print(f"  MAE: {beat3['mae']:.4f}")
    print(f"  IIEE: {beat3['iiee_total_km2']:,} km² (over: {iiee_over:,}, under: {iiee_under:,})")
    print(f"  F1 (15%): {f1:.3f}")
    
    # ── BEAT 4: Routing ──
    print("\n🔹 Beat 4: Route computation")
    from src.routing.alternatives import generate_alternatives, format_comparison_for_display
    
    def find_approach(lat, lon, land_mask, bathy, sic_ref, max_sic=0.85):
        dist = (lat_grid - lat)**2 + (lon_grid - lon)**2
        navigable = (land_mask < 0.5) & (bathy < -15.0) & (sic_ref <= max_sic)
        dist[~navigable] = np.inf
        return tuple(int(x) for x in np.unravel_index(np.argmin(dist), dist.shape))
    
    # Get destination grid cell
    dest_info = DOMAIN["stations"][destination]
    # Get origin grid cell (mid-ocean waypoint for Bharati)
    if destination == "bharati":
        origin_info = DOMAIN["origins"]["mid_ocean_waypoint"]
    else:
        origin_info = DOMAIN["origins"]["cape_town"]
    
    goal_yx = find_approach(dest_info["lat"], dest_info["lon"], land_mask, bathy, sic_input)
    start_yx = find_approach(origin_info["lat"], origin_info["lon"], land_mask, bathy, sic_input)
    
    # Build SIC field stack for the forecast horizon
    horizon = 14
    if sic_forecast_all is not None:
        sic_fields = sic_forecast_all[:horizon]
    else:
        sic_fields = []
        for d in range(horizon):
            dt = input_dt + np.timedelta64(d, 'D')
            idx = int(np.argmin(np.abs(ds.time.values - dt)))
            sic_fields.append(ds["sic"].values[idx])
        sic_fields = np.stack(sic_fields, axis=0)
    
    # Berg risk (zeros for now)
    berg_risk = np.zeros_like(sic_fields)
    
    routes, comparison, rejections = generate_alternatives(
        sic_fields=sic_fields,
        berg_risk_field=berg_risk,
        bathy=bathy,
        land_mask=land_mask,
        lat_grid=lat_grid,
        lon_grid=lon_grid,
        start_yx=start_yx,
        goal_yx=goal_yx,
        sic_today=sic_input,
    )
    
    beat4 = {
        "origin": {"name": origin_info.get("name", ""), 
                   "lat": origin_info["lat"], "lon": origin_info["lon"]},
        "destination": {"name": dest_info.get("name", destination),
                       "lat": dest_info["lat"], "lon": dest_info["lon"]},
        "comparison": comparison,
        "rejections": rejections,
    }
    
    # Print route comparison
    print(f"\n  {'Route':<30} {'Dist(nm)':>10} {'Time(h)':>10} {'Ice>70%(h)':>12} {'Fuel(t)':>10}")
    print("  " + "-" * 75)
    for row in comparison:
        if row["success"]:
            print(f"  {row['profile']:<30} {row['distance_nm']:>10.0f} {row['time_h']:>10.0f} "
                  f"{row['ice_hours_07']:>12.0f} {row['fuel_t']:>10.0f}")
        else:
            print(f"  {row['profile']:<30} {'FAILED':>10}")
    
    print("\n  Rejection reasons:")
    for r in rejections:
        marker = "✓" if r.get("recommended") else "✗"
        print(f"    {marker} {r['profile']}: {r['reason']}")
    
    # ── Save everything ──
    demo_output = {
        "demo_date": demo_date,
        "input_date": input_date,
        "destination": destination,
        "beat1_input": beat1,
        "beat2_forecast": beat2,
        "beat3_observation": beat3,
        "beat4_routing": {
            "comparison": comparison,
            "rejections": rejections,
        },
        "generated_at": datetime.now().isoformat(),
    }
    
    output_path = DEMO_DIR / f"demo_{demo_date}.json"
    with open(output_path, "w") as f:
        json.dump(demo_output, f, indent=2, default=str)
    
    print(f"\n  📁 Demo output saved to {output_path}")
    
    # ── Generate figures ──
    try:
        generate_demo_figures(ds, sic_input, sic_forecast, sic_observed, 
                            diff, lat_grid, lon_grid, land_mask, ocean_mask,
                            routes, demo_date, input_date)
    except Exception as e:
        print(f"  ⚠ Figure generation failed: {e}")
    
    print("\n" + "=" * 70)
    print("  DEMO COMPLETE")
    print("=" * 70)
    
    return demo_output


def generate_demo_figures(ds, sic_input, sic_forecast, sic_observed, diff,
                          lat_grid, lon_grid, land_mask, ocean_mask,
                          routes, demo_date, input_date):
    """Generate the demo PNGs."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.colors as mcolors
    
    fig, axes = plt.subplots(2, 2, figsize=(20, 16))
    fig.patch.set_facecolor('#0a0e1a')
    fig.suptitle(f'CryoNav Demo — {demo_date}', color='white', fontsize=20, fontweight='bold', y=0.98)
    
    # Custom ice colormap
    ice_colors = ['#0a1929', '#1a3a5c', '#2e6b8a', '#4da6c9', '#89d4f5', '#c8e6f5', '#ffffff']
    ice_cmap = mcolors.LinearSegmentedColormap.from_list('ice', ice_colors, N=256)
    
    # Diff colormap
    diff_colors = ['#ff4757', '#ff8c94', '#ffffff', '#89d4f5', '#0099cc']
    diff_cmap = mcolors.LinearSegmentedColormap.from_list('diff', diff_colors, N=256)
    
    panels = [
        (axes[0, 0], sic_input, ice_cmap, f'Input State ({input_date})', [0, 1]),
        (axes[0, 1], sic_forecast, ice_cmap, f'7-Day Forecast', [0, 1]),
        (axes[1, 0], sic_observed, ice_cmap, f'Observed ({demo_date})', [0, 1]),
        (axes[1, 1], diff, diff_cmap, f'Forecast − Observed', [-0.5, 0.5]),
    ]
    
    for ax, data, cmap, title, vlim in panels:
        ax.set_facecolor('#0a1929')
        
        masked = np.ma.masked_where(land_mask > 0.5, data)
        im = ax.pcolormesh(lon_grid, lat_grid, masked, cmap=cmap, 
                          vmin=vlim[0], vmax=vlim[1], shading='auto')
        
        # Land
        ax.contourf(lon_grid, lat_grid, land_mask, levels=[0.5, 1.5], 
                    colors=['#1a1a2e'], alpha=0.9)
        ax.contour(lon_grid, lat_grid, land_mask, levels=[0.5], 
                   colors=['#4a4a6a'], linewidths=0.5)
        
        # Station markers
        for stn_key, stn in DOMAIN["stations"].items():
            ax.plot(stn["lon"], stn["lat"], marker='*', color='#ff4757', 
                   markersize=12, markeredgecolor='white', markeredgewidth=0.5)
            ax.annotate(stn["name"], (stn["lon"], stn["lat"]),
                       color='white', fontsize=8, fontweight='bold',
                       xytext=(5, 5), textcoords='offset points')
        
        ax.set_title(title, color='white', fontsize=14, fontweight='bold', pad=10)
        ax.set_xlabel('Longitude', color='#8ba3c4', fontsize=10)
        ax.set_ylabel('Latitude', color='#8ba3c4', fontsize=10)
        ax.tick_params(colors='#5a7094')
        
        plt.colorbar(im, ax=ax, shrink=0.8, pad=0.02)
        
        for spine in ax.spines.values():
            spine.set_color('#2a3050')
    
    plt.tight_layout(rect=[0, 0, 1, 0.96])
    out_path = DEMO_DIR / f"demo_4panel_{demo_date}.png"
    plt.savefig(out_path, dpi=150, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()
    print(f"  📊 4-panel figure saved to {out_path}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CryoNav Demo")
    parser.add_argument("--date", type=str, default="2023-01-20")
    parser.add_argument("--input-date", type=str, default="2023-01-13")
    parser.add_argument("--dest", type=str, default="bharati")
    parser.add_argument("--all", action="store_true", help="Run all 3 demo dates")
    args = parser.parse_args()
    
    if args.all:
        destinations = {"2021-02-10": "bharati", "2023-01-20": "bharati", "2024-02-15": "maitri"}
        for demo_date in DOMAIN["held_out_demo_dates"]:
            input_dt = np.datetime64(demo_date) - np.timedelta64(DOMAIN["time"]["input_window_days"], "D")
            run_demo(demo_date, str(input_dt), destinations.get(demo_date, "bharati"))
    else:
        run_demo(args.date, args.input_date, args.dest)
