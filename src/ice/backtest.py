"""
CryoNav — Rolling-Origin Sea Ice Forecast Validation Harness.

Non-negotiable principles:
- No synthetic or placeholder data anywhere.
- Rolling-origin backtest across held-out years, held out strictly by time
  (Train: 2017-2022, Val: 2023, Test: 2024).
- Reports RMSE, MAE, IIEE (Goessling et al., 2016), and Binary Accuracy at the
  operational 15% ice edge, per lead day, against BOTH Persistence and
  Day-of-Year Daily Climatology baselines.
- Calculates empirical historical error distributions for calibrated uncertainty.
- A model without a validated skill number does not ship.
"""
import json
import csv
import sys
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import xarray as xr
import torch
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Canonical project imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, MODEL, get_project_root
from src.ice.dataset import SeaIceDataset
from src.ice.models import build_model
from src.ice.metrics import rmse, mae, iiee, binary_metrics, skill_score
from src.ice.baselines import compute_climatology, fit_damping_coefficients


class RollingOriginBacktest:
    """
    Scientific rolling-origin backtesting engine for Antarctic sea ice forecasting.
    
    Evaluates multi-lead forecasts (h = 1..14 days) over an entire held-out year,
    benchmarked rigorously against persistence and training-period climatology.
    """

    def __init__(
        self,
        zarr_path: Optional[str] = None,
        model_weights_path: Optional[str] = None,
        output_dir: Optional[str] = None,
        device: Optional[str] = None,
    ):
        root = get_project_root()
        self.zarr_path = str(root / DOMAIN["paths"]["zarr_cube"]) if zarr_path is None else zarr_path
        if model_weights_path is None:
            self.model_weights_path = str(root / "results" / "models" / "unet_v1_weights.pt")
        else:
            self.model_weights_path = model_weights_path

        self.output_dir = Path(root / "results") if output_dir is None else Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Device selection
        if device is None:
            if torch.cuda.is_available():
                self.device = torch.device("cuda")
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = torch.device("mps")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device)

        print(f"Initialized RollingOriginBacktest on device: {self.device}")
        print(f"Dataset: {self.zarr_path}")
        print(f"Model: {self.model_weights_path}")

        # Open dataset metadata
        self.ds = xr.open_zarr(self.zarr_path)
        self.ocean_mask = self.ds["sic_mask"].values.astype(np.float32)
        self.ny, self.nx = self.ocean_mask.shape
        self.cell_area_km2 = 625.0  # 25 km x 25 km

    def compute_baselines_calibration(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute training climatology (2017-2022) and fit damping coefficients on
        validation year (2023). Zero test data used.
        """
        train_end = DOMAIN["splits"]["train"][1]
        val_start = DOMAIN["splits"]["val"][0]
        val_end = DOMAIN["splits"]["val"][1]

        print(f"\n[1/4] Computing DOY Climatology from train period (2017-01-01 to {train_end})...")
        clim = compute_climatology(self.ds, clim_end=train_end)

        print(f"[2/4] Calibrating Damped Anomaly coefficients on validation period ({val_start} to {val_end})...")
        alphas = fit_damping_coefficients(
            self.ds, clim, self.ocean_mask,
            val_start=val_start, val_end=val_end, max_lead=14
        )
        return clim, alphas

    def load_model(self) -> torch.nn.Module:
        """Load trained PyTorch U-Net checkpoint."""
        ckpt = torch.load(self.model_weights_path, map_location=self.device, weights_only=False)
        in_channels = ckpt.get("in_channels", 94)
        model = build_model(in_channels=in_channels)
        
        state_dict = ckpt.get("model_state_dict", ckpt)
        model.load_state_dict(state_dict)
        model = model.to(self.device)
        model.eval()
        print(f"Model loaded ({sum(p.numel() for p in model.parameters()):,} parameters)")
        return model

    def calibrate_historical_uncertainty(
        self, model: torch.nn.Module, max_samples: int = 100
    ) -> Dict[str, Any]:
        """
        Calculate empirical historical error on the validation year (2023)
        to calibrate ensemble spread and prediction intervals without synthetic noise.
        """
        print("\n[3/4] Calibrating empirical historical error distribution on validation year (2023)...")
        val_dataset = SeaIceDataset(self.zarr_path, split="val", input_window=7, forecast_horizon=14)
        n_val = min(len(val_dataset), max_samples)
        
        # Accumulators for errors (lead, y, x)
        errors = [[] for _ in range(14)]
        
        step_stride = max(1, len(val_dataset) // n_val)
        sampled_indices = list(range(0, len(val_dataset), step_stride))[:n_val]
        
        with torch.no_grad():
            for idx in sampled_indices:
                sample = val_dataset[idx]
                inp = sample["input"].unsqueeze(0).to(self.device)
                pred = model(inp).squeeze(0).cpu().numpy()  # (14, ny, nx)
                target = sample["target"].numpy()            # (14, ny, nx)
                
                diff = (pred - target) * self.ocean_mask
                for h in range(14):
                    errors[h].append(diff[h])
        
        sigma_spatial = np.zeros((14, self.ny, self.nx), dtype=np.float32)
        sigma_scalar = np.zeros(14, dtype=np.float32)
        
        for h in range(14):
            err_arr = np.stack(errors[h], axis=0)  # (N, ny, nx)
            spatial_std = np.std(err_arr, axis=0) * self.ocean_mask
            sigma_spatial[h] = spatial_std
            # Scalar std over ocean cells
            ocean_errs = err_arr[:, self.ocean_mask > 0]
            sigma_scalar[h] = float(np.std(ocean_errs))
            
        np.save(self.output_dir / "historical_error_sigma.npy", sigma_spatial)
        print(f"Historical residual error calibrated. Lead 1 std: {sigma_scalar[0]:.4f}, Lead 14 std: {sigma_scalar[-1]:.4f}")
        return {
            "sigma_scalar_per_lead": [round(float(s), 6) for s in sigma_scalar],
            "sigma_file": str(self.output_dir / "historical_error_sigma.npy")
        }

    def run(self, max_test_samples: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute the rolling-origin backtest on the independent test year (2024).
        """
        t_start = time.time()
        clim, alphas = self.compute_baselines_calibration()
        model = self.load_model()
        uncertainty = self.calibrate_historical_uncertainty(model)

        print("\n[4/4] Executing rolling-origin backtest on 2024 independent test set...")
        test_dataset = SeaIceDataset(self.zarr_path, split="test", input_window=7, forecast_horizon=14)
        n_samples = len(test_dataset)
        if max_test_samples is not None and max_test_samples < n_samples:
            indices = np.linspace(0, n_samples - 1, max_test_samples, dtype=int)
            n_eval = len(indices)
        else:
            indices = list(range(n_samples))
            n_eval = n_samples

        print(f"Evaluating {n_eval} origin dates across 14 lead days each ({n_eval * 14} field forecasts)...")

        methods = ["persistence", "climatology", "damped_anomaly", "unet_v1"]
        metrics_accum: Dict[str, Dict[str, List[float]]] = {
            m: {
                "rmse": [0.0] * 14,
                "mae": [0.0] * 14,
                "iiee_total": [0.0] * 14,
                "iiee_over": [0.0] * 14,
                "iiee_under": [0.0] * 14,
                "iiee_aee": [0.0] * 14,
                "iiee_me": [0.0] * 14,
                "accuracy_15": [0.0] * 14,
                "f1_15": [0.0] * 14,
            }
            for m in methods
        }

        all_times = self.ds.time.values
        valid_start_indices = test_dataset.valid_starts

        for count, idx in enumerate(indices):
            global_t = valid_start_indices[idx]
            local_t = global_t - test_dataset.t_min
            t0_date = str(np.datetime64(all_times[global_t], "D"))
            t0_doy = int(np.datetime64(all_times[global_t], "D").astype(object).timetuple().tm_yday)

            # Ground truth targets for leads 1..14
            item = test_dataset[idx]
            targets = item["target"].numpy()  # (14, ny, nx)
            today_sic = test_dataset.raw_sic[local_t]  # (ny, nx)

            # 1. Deep Learning U-Net Forecast
            with torch.no_grad():
                inp = item["input"].unsqueeze(0).to(self.device)
                pred_unet = model(inp).squeeze(0).cpu().numpy()  # (14, ny, nx)
                pred_unet = np.clip(pred_unet, 0.0, 1.0)

            # 2. Persistence Forecast (held constant)
            pred_pers = np.stack([today_sic] * 14, axis=0)

            # 3. Climatology Forecast & 4. Damped Anomaly Forecast
            pred_clim = []
            pred_damp = []
            anomaly_today = today_sic - clim[t0_doy - 1]

            for h in range(1, 15):
                target_doy = ((t0_doy - 1 + h) % 366) + 1
                clim_target = clim[target_doy - 1]
                pred_clim.append(clim_target)

                # Damped anomaly
                alpha = alphas[h - 1]
                damp = np.clip(clim_target + (alpha ** h) * anomaly_today, 0.0, 1.0)
                pred_damp.append(damp)

            pred_clim = np.stack(pred_clim, axis=0)
            pred_damp = np.stack(pred_damp, axis=0)

            preds_dict = {
                "persistence": pred_pers,
                "climatology": pred_clim,
                "damped_anomaly": pred_damp,
                "unet_v1": pred_unet,
            }

            # Evaluate metrics for all 14 leads
            for m_name, pred_arr in preds_dict.items():
                for h in range(14):
                    p_field = pred_arr[h]
                    t_field = targets[h]

                    r = rmse(p_field, t_field, self.ocean_mask)
                    m = mae(p_field, t_field, self.ocean_mask)
                    ice_err = iiee(p_field, t_field, self.ocean_mask, threshold=0.15, cell_area_km2=self.cell_area_km2)
                    b_metrics = binary_metrics(p_field, t_field, self.ocean_mask, threshold=0.15)

                    metrics_accum[m_name]["rmse"][h] += r
                    metrics_accum[m_name]["mae"][h] += m
                    metrics_accum[m_name]["iiee_total"][h] += ice_err["total_km2"]
                    metrics_accum[m_name]["iiee_over"][h] += ice_err["over_km2"]
                    metrics_accum[m_name]["iiee_under"][h] += ice_err["under_km2"]
                    metrics_accum[m_name]["iiee_aee"][h] += ice_err["aee_km2"]
                    metrics_accum[m_name]["iiee_me"][h] += ice_err["me_km2"]
                    metrics_accum[m_name]["accuracy_15"][h] += b_metrics["accuracy"]
                    metrics_accum[m_name]["f1_15"][h] += b_metrics["f1"]

            if (count + 1) % 50 == 0 or (count + 1) == n_eval:
                print(f"  Processed {count + 1}/{n_eval} origin dates (latest: {t0_date})...")

        # Average metrics across all evaluated origins
        summary_by_method: Dict[str, Dict[str, List[float]]] = {}
        for m_name in methods:
            summary_by_method[m_name] = {}
            for metric_key, values in metrics_accum[m_name].items():
                summary_by_method[m_name][metric_key] = [float(round(float(v / n_eval), 6)) for v in values]

        # Compute skill scores of U-Net vs Persistence and vs Climatology
        skill_vs_pers = []
        skill_vs_clim = []
        for h in range(14):
            mse_unet = summary_by_method["unet_v1"]["rmse"][h] ** 2
            mse_pers = summary_by_method["persistence"]["rmse"][h] ** 2
            mse_clim = summary_by_method["climatology"]["rmse"][h] ** 2

            skill_vs_pers.append(float(round(skill_score(mse_unet, mse_pers), 4)))
            skill_vs_clim.append(float(round(skill_score(mse_unet, mse_clim), 4)))

        summary_by_method["unet_v1"]["skill_vs_persistence"] = skill_vs_pers
        summary_by_method["unet_v1"]["skill_vs_climatology"] = skill_vs_clim

        # Write results files
        results_payload = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "test_year": 2024,
                "test_samples_evaluated": n_eval,
                "cell_area_km2": float(self.cell_area_km2),
                "spatial_domain": DOMAIN["region"]["name"],
                "projection": "EPSG:3031",
                "elapsed_seconds": float(round(time.time() - t_start, 2)),
            },
            "calibrated_uncertainty": uncertainty,
            "damping_coefficients_alpha": [float(a) for a in alphas],
            "results_by_method": summary_by_method,
        }

        json_path = self.output_dir / "backtest_results.json"
        with open(json_path, "w") as f:
            json.dump(results_payload, f, indent=2)

        # Write tabular CSV
        csv_path = self.output_dir / "backtest_summary.csv"
        self._write_csv_summary(csv_path, summary_by_method)

        # Generate plot
        plot_path = self.output_dir / "skill_curves.png"
        self._plot_curves(plot_path, summary_by_method)

        print("\n" + "=" * 80)
        print("ROLLING-ORIGIN BACKTEST COMPLETE (HELD-OUT 2024 TEST YEAR)")
        print("=" * 80)
        self._print_tabular_summary(summary_by_method)
        print("=" * 80)
        print(f"Results JSON: {json_path}")
        print(f"Summary CSV:  {csv_path}")
        print(f"Figure:       {plot_path}")

        return results_payload

    def _write_csv_summary(self, path: Path, data: Dict[str, Dict[str, List[float]]]):
        """Save formatted comparison table across all lead days."""
        headers = [
            "lead_day",
            "model_rmse", "persistence_rmse", "climatology_rmse", "damped_rmse",
            "model_iiee_km2", "persistence_iiee_km2", "climatology_iiee_km2",
            "model_acc_15", "persistence_acc_15", "climatology_acc_15",
            "skill_vs_persistence", "skill_vs_climatology"
        ]
        with open(path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for h in range(14):
                lead = h + 1
                row = [
                    lead,
                    data["unet_v1"]["rmse"][h],
                    data["persistence"]["rmse"][h],
                    data["climatology"]["rmse"][h],
                    data["damped_anomaly"]["rmse"][h],
                    data["unet_v1"]["iiee_total"][h],
                    data["persistence"]["iiee_total"][h],
                    data["climatology"]["iiee_total"][h],
                    data["unet_v1"]["accuracy_15"][h],
                    data["persistence"]["accuracy_15"][h],
                    data["climatology"]["accuracy_15"][h],
                    data["unet_v1"]["skill_vs_persistence"][h],
                    data["unet_v1"]["skill_vs_climatology"][h],
                ]
                writer.writerow(row)

    def _plot_curves(self, path: Path, data: Dict[str, Dict[str, List[float]]]):
        """Generate high-resolution publication plot for validation skill."""
        leads = list(range(1, 15))
        fig, axes = plt.subplots(1, 3, figsize=(18, 5), dpi=300)

        # 1. RMSE vs Lead
        ax = axes[0]
        ax.plot(leads, data["unet_v1"]["rmse"], "o-", color="#3b82f6", linewidth=2.5, label="U-Net v1 (Deep Learning)")
        ax.plot(leads, data["damped_anomaly"]["rmse"], "s--", color="#10b981", linewidth=1.8, label="Damped Anomaly")
        ax.plot(leads, data["persistence"]["rmse"], "^--", color="#f59e0b", linewidth=1.8, label="Persistence")
        ax.plot(leads, data["climatology"]["rmse"], "d:", color="#ef4444", linewidth=1.8, label="DOY Climatology")
        ax.set_title("RMSE on Ocean Cells vs Lead Day", fontsize=12, fontweight="bold")
        ax.set_xlabel("Forecast Horizon (Days)", fontsize=11)
        ax.set_ylabel("RMSE (SIC fractional error)", fontsize=11)
        ax.set_xticks(leads)
        ax.grid(True, alpha=0.3)
        ax.legend(frameon=True, fontsize=9)

        # 2. IIEE vs Lead
        ax = axes[1]
        ax.plot(leads, [x / 1000.0 for x in data["unet_v1"]["iiee_total"]], "o-", color="#3b82f6", linewidth=2.5, label="U-Net v1")
        ax.plot(leads, [x / 1000.0 for x in data["damped_anomaly"]["iiee_total"]], "s--", color="#10b981", linewidth=1.8, label="Damped Anomaly")
        ax.plot(leads, [x / 1000.0 for x in data["persistence"]["iiee_total"]], "^--", color="#f59e0b", linewidth=1.8, label="Persistence")
        ax.plot(leads, [x / 1000.0 for x in data["climatology"]["iiee_total"]], "d:", color="#ef4444", linewidth=1.8, label="DOY Climatology")
        ax.set_title("Integrated Ice Edge Error (IIEE, 15% Edge)", fontsize=12, fontweight="bold")
        ax.set_xlabel("Forecast Horizon (Days)", fontsize=11)
        ax.set_ylabel("IIEE (x 1,000 km²)", fontsize=11)
        ax.set_xticks(leads)
        ax.grid(True, alpha=0.3)
        ax.legend(frameon=True, fontsize=9)

        # 3. Skill Score vs Lead
        ax = axes[2]
        ax.axhline(0, color="gray", linestyle="--", alpha=0.7)
        ax.plot(leads, data["unet_v1"]["skill_vs_persistence"], "o-", color="#059669", linewidth=2.5, label="Skill vs Persistence")
        ax.plot(leads, data["unet_v1"]["skill_vs_climatology"], "s-", color="#2563eb", linewidth=2.5, label="Skill vs Climatology")
        ax.set_title("Model Skill Score: 1 - (MSE / MSE_baseline)", fontsize=12, fontweight="bold")
        ax.set_xlabel("Forecast Horizon (Days)", fontsize=11)
        ax.set_ylabel("Skill Score", fontsize=11)
        ax.set_xticks(leads)
        ax.grid(True, alpha=0.3)
        ax.legend(frameon=True, fontsize=9)

        plt.suptitle("CryoNav Operational Validation: 2024 Held-Out Southern Ocean Record", fontsize=14, fontweight="bold", y=1.03)
        plt.tight_layout()
        plt.savefig(path, bbox_inches="tight")
        plt.close()

    def _print_tabular_summary(self, data: Dict[str, Dict[str, List[float]]]):
        """Print concise ASCII summary table for user review."""
        print(f"{'Lead':<5} | {'U-Net RMSE':<11} | {'Pers RMSE':<10} | {'Clim RMSE':<10} | {'U-Net IIEE (km²)':<17} | {'Pers IIEE (km²)':<16} | {'Skill vs Pers':<13} | {'Skill vs Clim'}")
        print("-" * 105)
        for h in [0, 2, 6, 9, 13]:  # Leads 1, 3, 7, 10, 14
            lead = h + 1
            print(
                f"{lead:<5} | "
                f"{data['unet_v1']['rmse'][h]:<11.4f} | "
                f"{data['persistence']['rmse'][h]:<10.4f} | "
                f"{data['climatology']['rmse'][h]:<10.4f} | "
                f"{data['unet_v1']['iiee_total'][h]:<17.0f} | "
                f"{data['persistence']['iiee_total'][h]:<16.0f} | "
                f"{data['unet_v1']['skill_vs_persistence'][h]:<13.4f} | "
                f"{data['unet_v1']['skill_vs_climatology'][h]:.4f}"
            )


def main():
    harness = RollingOriginBacktest()
    # Evaluate across 2024 held-out test origins
    harness.run(max_test_samples=155)


if __name__ == "__main__":
    main()
