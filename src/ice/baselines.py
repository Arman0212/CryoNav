"""
CryoNav — Sea-ice forecast baselines.

Implements four classical baselines before the deep learning model:
1. Persistence: tomorrow = today
2. Day-of-year climatology: mean field for that calendar day
3. Damped anomaly persistence: clim + α^lead × (today − clim), α fit per lead
4. Trend-decay weighted regression on the last 7 days

Vectorized in-memory implementation for instant evaluation.
"""
import numpy as np
import xarray as xr
from pathlib import Path
import sys, csv
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, MODEL


def persistence_forecast(sic_today: np.ndarray, lead_days: int = 14) -> np.ndarray:
    """Persistence: SIC stays the same for all lead days."""
    return np.stack([sic_today] * lead_days, axis=0)


def climatology_forecast(sic_clim: np.ndarray, target_doys: list) -> np.ndarray:
    """Day-of-year climatology forecast."""
    forecasts = []
    for doy in target_doys:
        idx = (doy - 1) % 366
        forecasts.append(sic_clim[idx])
    return np.stack(forecasts, axis=0)


def compute_climatology(ds: xr.Dataset, clim_end: str = None) -> np.ndarray:
    """Compute day-of-year climatology from the training period."""
    if clim_end is None:
        clim_end = DOMAIN["splits"]["train"][1]
    
    sic_sub = ds["sic"].sel(time=slice(None, clim_end))
    sic_arr = sic_sub.values  # (N, H, W)
    times = sic_sub.time.values
    
    clim = np.zeros((366, sic_arr.shape[1], sic_arr.shape[2]), dtype=np.float32)
    counts = np.zeros(366, dtype=np.float32)
    
    for i, t in enumerate(times):
        doy = int(np.datetime64(t, 'D').astype('datetime64[D]').astype(object).timetuple().tm_yday)
        clim[doy - 1] += sic_arr[i]
        counts[doy - 1] += 1
    
    for d in range(366):
        if counts[d] > 0:
            clim[d] /= counts[d]
    
    return clim


def fit_damping_coefficients(ds: xr.Dataset, sic_clim: np.ndarray,
                             ocean_mask: np.ndarray,
                             val_start: str = None,
                             val_end: str = None,
                             max_lead: int = 14) -> np.ndarray:
    """
    Fit damping coefficient α per lead day.
    Damped anomaly: forecast = clim(t+lead) + α^lead × (sic(t) - clim(t))
    Minimize MSE over the validation period.
    """
    if val_start is None:
        val_start = DOMAIN["splits"]["val"][0]
    if val_end is None:
        val_end = DOMAIN["splits"]["val"][1]
        
    val_sub = ds["sic"].sel(time=slice(val_start, val_end))
    sic = val_sub.values  # (N, H, W)
    times = val_sub.time.values
    n_times = len(times)
    
    doys = [int(np.datetime64(t, 'D').astype('datetime64[D]').astype(object).timetuple().tm_yday) for t in times]
    alphas = np.zeros(max_lead, dtype=np.float32)
    
    for lead in range(1, max_lead + 1):
        best_alpha = 0.5
        best_mse = np.inf
        
        for alpha in np.arange(0.05, 1.0, 0.05):
            mse_sum = 0.0
            count = 0
            
            for i in range(n_times - lead):
                doy_t0 = doys[i]
                doy_target = doys[i + lead]
                
                clim_t0 = sic_clim[doy_t0 - 1]
                clim_target = sic_clim[doy_target - 1]
                
                anomaly = sic[i] - clim_t0
                forecast = np.clip(clim_target + (alpha ** lead) * anomaly, 0, 1)
                
                actual = sic[i + lead]
                diff = (forecast - actual) * ocean_mask
                mse_sum += np.mean(diff ** 2)
                count += 1
            
            if count > 0:
                mse = mse_sum / count
                if mse < best_mse:
                    best_mse = mse
                    best_alpha = alpha
        
        alphas[lead - 1] = best_alpha
        print(f"  Lead {lead:2d}: α = {best_alpha:.2f}, MSE = {best_mse:.6f}")
    
    return alphas


def damped_anomaly_forecast(sic_today: np.ndarray, today_doy: int,
                            sic_clim: np.ndarray, alphas: np.ndarray,
                            max_lead: int = 14) -> np.ndarray:
    """Damped anomaly persistence forecast."""
    forecasts = []
    anomaly = sic_today - sic_clim[today_doy - 1]
    
    for lead in range(1, max_lead + 1):
        target_doy = ((today_doy - 1 + lead) % 366) + 1
        clim_target = sic_clim[target_doy - 1]
        alpha = alphas[lead - 1]
        
        forecast = np.clip(clim_target + (alpha ** lead) * anomaly, 0, 1)
        forecasts.append(forecast)
    
    return np.stack(forecasts, axis=0)


def ridge_regression_forecast(sic_window: np.ndarray, max_lead: int = 14) -> np.ndarray:
    """
    Weighted autoregressive forecast on the last 7 days.
    Decays toward persistence with increasing lead.
    """
    weights = np.array([0.05, 0.05, 0.1, 0.1, 0.15, 0.2, 0.35], dtype=np.float32)
    weighted_today = np.tensordot(weights, sic_window, axes=([0], [0]))
    
    forecasts = []
    for lead in range(1, max_lead + 1):
        decay = 0.95 ** lead
        forecast = np.clip(decay * weighted_today + (1 - decay) * sic_window[-1], 0, 1)
        forecasts.append(forecast)
    
    return np.stack(forecasts, axis=0)


def evaluate_baselines(ds: xr.Dataset, output_dir: str = None, max_lead: int = 14):
    """
    Evaluate all four baselines on the test period (2024).
    Saves results to results/baselines.csv.
    """
    if output_dir is None:
        output_dir = str(Path(__file__).resolve().parent.parent.parent / "results")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Evaluating baselines on test period")
    print("=" * 60)
    
    ocean_mask = ds["sic_mask"].values.astype(np.float32)
    
    # 1. Climatology
    print("\n1. Computing day-of-year climatology from train period (2017-2022)...")
    sic_clim = compute_climatology(ds)
    
    # 2. Damping Coefficients
    print("\n2. Fitting damped anomaly coefficients on val period (2023)...")
    alphas = fit_damping_coefficients(ds, sic_clim, ocean_mask)
    
    # 3. Test Evaluation
    test_start = DOMAIN["splits"]["test"][0]
    test_end = DOMAIN["splits"]["test"][1]
    
    sic_test_sub = ds["sic"].sel(time=slice(test_start, test_end))
    sic_test = sic_test_sub.values.astype(np.float32)
    times_test = sic_test_sub.time.values
    n_test = len(times_test)
    doys_test = [int(np.datetime64(t, 'D').astype('datetime64[D]').astype(object).timetuple().tm_yday) for t in times_test]
    
    held_out = set(DOMAIN.get("held_out_demo_dates", []))
    
    methods = ["persistence", "climatology", "damped_anomaly", "ridge_regression"]
    rmse = {m: np.zeros(max_lead) for m in methods}
    mae = {m: np.zeros(max_lead) for m in methods}
    counts = np.zeros(max_lead)
    
    n_eval = 0
    print(f"\n3. Evaluating on test period ({test_start} to {test_end})...")
    
    for i in range(7, n_test - max_lead):
        t0 = times_test[i]
        
        # Skip if any window day touches held-out dates
        window_dates = set(str(np.datetime64(times_test[i - j], 'D')) for j in range(8))
        target_dates = set(str(np.datetime64(times_test[i + j], 'D')) for j in range(1, max_lead + 1))
        
        if window_dates & held_out or target_dates & held_out:
            continue
        
        sic_today = sic_test[i]
        sic_window = sic_test[i-6:i+1]  # last 7 days
        doy = doys_test[i]
        
        # Forecasts
        f_persist = persistence_forecast(sic_today, max_lead)
        target_doys = [((doy - 1 + l) % 366) + 1 for l in range(1, max_lead + 1)]
        f_clim = climatology_forecast(sic_clim, target_doys)
        f_damped = damped_anomaly_forecast(sic_today, doy, sic_clim, alphas, max_lead)
        f_ridge = ridge_regression_forecast(sic_window, max_lead=max_lead)
        
        forecasts = {
            "persistence": f_persist,
            "climatology": f_clim,
            "damped_anomaly": f_damped,
            "ridge_regression": f_ridge,
        }
        
        # Evaluate
        for lead in range(max_lead):
            actual = sic_test[i + lead + 1]
            for method, fc in forecasts.items():
                diff = (fc[lead] - actual) * ocean_mask
                rmse[method][lead] += np.mean(diff ** 2)
                mae[method][lead] += np.mean(np.abs(diff))
            
            counts[lead] += 1
        
        n_eval += 1
    
    # Finalize
    for method in methods:
        for lead in range(max_lead):
            if counts[lead] > 0:
                rmse[method][lead] = np.sqrt(rmse[method][lead] / counts[lead])
                mae[method][lead] /= counts[lead]
    
    # Save to CSV
    csv_path = Path(output_dir) / "baselines.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["method", "lead_day", "rmse", "mae"])
        for method in methods:
            for lead in range(max_lead):
                writer.writerow([method, lead + 1,
                                f"{rmse[method][lead]:.6f}",
                                f"{mae[method][lead]:.6f}"])
    
    print(f"\n✓ Results saved to {csv_path}")
    print(f"  Evaluated {n_eval} test start dates × {max_lead} lead days")
    
    # Print summary table
    print(f"\n{'Method':<25} {'Day 1 RMSE':>12} {'Day 7 RMSE':>12} {'Day 14 RMSE':>12}")
    print("-" * 65)
    for method in methods:
        print(f"{method:<25} {rmse[method][0]:>12.4f} {rmse[method][6]:>12.4f} {rmse[method][13]:>12.4f}")
    
    return rmse, mae, alphas, sic_clim


if __name__ == "__main__":
    zarr_path = str(Path(__file__).resolve().parent.parent.parent / DOMAIN["paths"]["zarr_cube"])
    print(f"Loading data from {zarr_path}...")
    ds = xr.open_zarr(zarr_path)
    evaluate_baselines(ds)
