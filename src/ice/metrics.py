"""
CryoNav — Sea-ice forecast metrics.

Metrics that matter:
- RMSE and MAE on SIC (ocean cells only)
- IIEE (Integrated Ice Edge Error) with over/under split
- Binary accuracy / F1 at 15% and 70% thresholds
- Skill score vs. damped anomaly persistence
- MIZ-only variants of all metrics
"""
import numpy as np
import json, csv
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN


def rmse(pred, actual, mask):
    """Root Mean Square Error, ocean cells only."""
    diff = (pred - actual) * mask
    return np.sqrt(np.sum(diff**2) / np.sum(mask).clip(1))


def mae(pred, actual, mask):
    """Mean Absolute Error, ocean cells only."""
    diff = np.abs(pred - actual) * mask
    return np.sum(diff) / np.sum(mask).clip(1)


def iiee(pred, actual, mask, threshold=0.15, cell_area_km2=625.0):
    """
    Integrated Ice Edge Error (IIEE).
    
    Area where forecast and observation disagree about whether SIC >= threshold.
    Returns total, over-prediction, and under-prediction areas in km².
    """
    pred_ice = ((pred >= threshold) & (mask > 0)).astype(np.float32)
    actual_ice = ((actual >= threshold) & (mask > 0)).astype(np.float32)
    
    # Over-prediction: model says ice, reality says no
    over = np.sum((pred_ice > actual_ice).astype(np.float32)) * cell_area_km2
    
    # Under-prediction: model says no ice, reality says ice
    under = np.sum((pred_ice < actual_ice).astype(np.float32)) * cell_area_km2
    
    total = over + under
    
    return {"total_km2": float(total), "over_km2": float(over), "under_km2": float(under)}


def binary_metrics(pred, actual, mask, threshold=0.15):
    """Binary accuracy and F1 at a given SIC threshold."""
    pred_binary = ((pred >= threshold) & (mask > 0)).astype(np.float32)
    actual_binary = ((actual >= threshold) & (mask > 0)).astype(np.float32)
    
    valid = mask > 0
    n_valid = np.sum(valid)
    
    if n_valid == 0:
        return {"accuracy": 0, "f1": 0, "precision": 0, "recall": 0}
    
    tp = np.sum((pred_binary == 1) & (actual_binary == 1) & valid)
    tn = np.sum((pred_binary == 0) & (actual_binary == 0) & valid)
    fp = np.sum((pred_binary == 1) & (actual_binary == 0) & valid)
    fn = np.sum((pred_binary == 0) & (actual_binary == 1) & valid)
    
    accuracy = float((tp + tn) / n_valid)
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    
    return {"accuracy": accuracy, "f1": f1, "precision": precision, "recall": recall}


def skill_score(mse_model, mse_baseline):
    """Skill score: 1 - MSE_model / MSE_baseline."""
    if mse_baseline == 0:
        return 0.0
    return 1.0 - mse_model / mse_baseline


def compute_miz_mask(sic_clim, threshold=0.05):
    """Marginal ice zone mask: cells with high climatological SIC variance."""
    if sic_clim.ndim == 3:
        var = np.var(sic_clim, axis=0)
    else:
        var = sic_clim
    return (var > threshold).astype(np.float32)


def plot_skill_vs_lead(results: dict, output_path: str = None):
    """
    Plot skill score vs. lead day — the single most persuasive figure.
    
    results: dict with keys = method names, values = arrays of RMSE per lead day
    """
    if output_path is None:
        output_path = str(Path(__file__).resolve().parent.parent.parent / 
                         "results" / "skill_vs_lead.png")
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.patch.set_facecolor('#0a0e1a')
    
    colors = {
        "persistence": "#ff6b6b",
        "climatology": "#ffd93d",
        "damped_anomaly": "#6bcb77",
        "ridge_regression": "#4ecdc4",
        "unet": "#4d96ff",
    }
    
    lead_days = np.arange(1, 15)
    
    # --- Panel 1: RMSE vs Lead Day ---
    ax = axes[0]
    ax.set_facecolor('#0f1429')
    for method, rmse_vals in results.items():
        if "rmse" in method.lower() or isinstance(rmse_vals, dict):
            continue
        color = colors.get(method, "#ffffff")
        lw = 3 if method == "unet" else 1.5
        ax.plot(lead_days, rmse_vals[:14], color=color, linewidth=lw,
                marker='o' if method == 'unet' else None, markersize=4,
                label=method.replace("_", " ").title(), zorder=5 if method == 'unet' else 3)
    
    ax.set_xlabel("Lead Day", color='white', fontsize=12)
    ax.set_ylabel("RMSE (SIC)", color='white', fontsize=12)
    ax.set_title("RMSE vs Lead Day", color='white', fontsize=14, fontweight='bold')
    ax.legend(facecolor='#1a1f3a', edgecolor='#2a3050', labelcolor='white', fontsize=9)
    ax.tick_params(colors='white')
    ax.grid(True, alpha=0.15, color='white')
    ax.set_xlim(1, 14)
    for spine in ax.spines.values():
        spine.set_color('#2a3050')
    
    # --- Panel 2: Skill Score vs Damped Anomaly Persistence ---
    ax = axes[1]
    ax.set_facecolor('#0f1429')
    
    if "damped_anomaly" in results and "unet" in results:
        dap_mse = results["damped_anomaly"][:14] ** 2
        for method in ["persistence", "climatology", "ridge_regression", "unet"]:
            if method in results:
                model_mse = results[method][:14] ** 2
                ss = np.array([skill_score(model_mse[i], dap_mse[i]) for i in range(14)])
                color = colors.get(method, "#ffffff")
                lw = 3 if method == "unet" else 1.5
                ax.plot(lead_days, ss, color=color, linewidth=lw,
                        marker='o' if method == 'unet' else None, markersize=4,
                        label=method.replace("_", " ").title())
    
    ax.axhline(y=0, color='white', linestyle='--', alpha=0.5, linewidth=1)
    ax.set_xlabel("Lead Day", color='white', fontsize=12)
    ax.set_ylabel("Skill Score vs DAP", color='white', fontsize=12)
    ax.set_title("Skill Score vs Damped Anomaly", color='white', fontsize=14, fontweight='bold')
    ax.legend(facecolor='#1a1f3a', edgecolor='#2a3050', labelcolor='white', fontsize=9)
    ax.tick_params(colors='white')
    ax.grid(True, alpha=0.15, color='white')
    ax.set_xlim(1, 14)
    for spine in ax.spines.values():
        spine.set_color('#2a3050')
    
    # --- Panel 3: IIEE vs Lead Day ---
    ax = axes[2]
    ax.set_facecolor('#0f1429')
    
    if "iiee" in results:
        for method, iiee_vals in results["iiee"].items():
            color = colors.get(method, "#ffffff")
            lw = 3 if method == "unet" else 1.5
            ax.plot(lead_days, iiee_vals[:14], color=color, linewidth=lw,
                    marker='o' if method == 'unet' else None, markersize=4,
                    label=method.replace("_", " ").title())
    
    ax.set_xlabel("Lead Day", color='white', fontsize=12)
    ax.set_ylabel("IIEE (×1000 km²)", color='white', fontsize=12)
    ax.set_title("Ice Edge Error vs Lead Day", color='white', fontsize=14, fontweight='bold')
    ax.legend(facecolor='#1a1f3a', edgecolor='#2a3050', labelcolor='white', fontsize=9)
    ax.tick_params(colors='white')
    ax.grid(True, alpha=0.15, color='white')
    ax.set_xlim(1, 14)
    for spine in ax.spines.values():
        spine.set_color('#2a3050')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved skill-vs-lead plot to {output_path}")
