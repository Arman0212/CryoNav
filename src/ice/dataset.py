"""
CryoNav — PyTorch Dataset for sea-ice concentration forecasting.

Input: K=7 days of SIC + drivers + derived + static channels
Output: SIC for lead days 1–14, shape (14, H, W)

Strict temporal split:
  train: 2017–2022
  val:   2023
  test:  2024

ASSERTION: held-out demo dates are NEVER in any sample's window.
High-Performance In-Memory caching for rapid PyTorch training.
"""
import numpy as np
import xarray as xr
import torch
from torch.utils.data import Dataset
from pathlib import Path
from datetime import datetime, timedelta
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, MODEL


class SeaIceDataset(Dataset):
    """
    Sea-ice concentration forecast dataset with in-memory caching.
    
    Each sample:
      input: (C, H, W) where C = K * (SIC + drivers + derived) + static
      target: (14, H, W) SIC for lead days 1–14
      mask: (H, W) ocean mask for loss computation
      miz_weight: (H, W) marginal ice zone upweighting
    """
    
    DRIVER_VARS = ["u10", "v10", "t2m", "msl", "sst", "wind_speed", "wind_div"]
    DERIVED_VARS = ["sic_anomaly", "sic_tend_3d", "sic_tend_7d"]
    STATIC_VARS = ["dist_to_coast", "bathy", "land_mask"]
    
    def __init__(self, zarr_path: str, split: str = "train",
                 input_window: int = 7, forecast_horizon: int = 14):
        """
        Args:
            zarr_path: Path to the analysis-ready Zarr cube
            split: 'train', 'val', or 'test'
            input_window: Number of input days (K)
            forecast_horizon: Number of forecast lead days
        """
        self.ds = xr.open_zarr(zarr_path)
        self.K = input_window
        self.H = forecast_horizon
        self.split = split
        
        # Time bounds for this split
        split_bounds = DOMAIN["splits"][split]
        self.t_start = np.datetime64(split_bounds[0])
        self.t_end = np.datetime64(split_bounds[1])
        
        # Get valid time indices
        all_times = self.ds.time.values
        time_mask = (all_times >= self.t_start) & (all_times <= self.t_end)
        self.split_indices = np.where(time_mask)[0]
        
        # Build held-out exclusion set (date strings)
        self.held_out_dates = set()
        for demo_date in DOMAIN.get("held_out_demo_dates", []):
            d = np.datetime64(demo_date)
            # Exclude any date within K + H days of the demo date
            for offset in range(-self.K, self.H + 1):
                excl = d + np.timedelta64(offset, 'D')
                self.held_out_dates.add(excl)
        
        # Build valid start indices
        self.valid_starts = []
        for idx in self.split_indices:
            if idx < self.K - 1:
                continue
            if idx + self.H >= len(all_times):
                continue
            
            # Check held-out exclusion
            window_times = all_times[idx - self.K + 1: idx + self.H + 1]
            excluded = any(t in self.held_out_dates for t in window_times)
            if excluded:
                continue
            
            self.valid_starts.append(idx)
        
        self.valid_starts = np.array(self.valid_starts)
        
        # Preload static fields (H, W)
        self.ocean_mask = self.ds["sic_mask"].values.astype(np.float32)
        self.static = np.stack([
            self._normalize(self.ds[v].values, v) for v in self.STATIC_VARS
        ], axis=0).astype(np.float32)  # (n_static, H, W)
        
        # Preload active time slice arrays in memory for instant __getitem__ indexing
        # Time slice spans from min(valid_starts)-K+1 to max(valid_starts)+H+1
        if len(self.valid_starts) > 0:
            t_min = max(0, self.valid_starts[0] - self.K + 1)
            t_max = min(len(all_times), self.valid_starts[-1] + self.H + 1)
            self.t_min = t_min
            
            self.cached_vars = {}
            for v in ["sic"] + self.DRIVER_VARS + self.DERIVED_VARS:
                arr = self.ds[v].isel(time=slice(t_min, t_max)).values
                self.cached_vars[v] = self._normalize(arr, v).astype(np.float32)
            
            self.cached_sin_doy = self.ds["sin_doy"].isel(time=slice(t_min, t_max)).values.astype(np.float32)
            self.cached_cos_doy = self.ds["cos_doy"].isel(time=slice(t_min, t_max)).values.astype(np.float32)
            self.raw_sic = np.clip(self.ds["sic"].isel(time=slice(t_min, t_max)).values, 0, 1).astype(np.float32)
        else:
            self.t_min = 0
            self.cached_vars = {}
            self.raw_sic = np.zeros((0, 264, 220), dtype=np.float32)
        
        # Compute MIZ weight map (cells with high SIC variance)
        if split == "train" and len(self.valid_starts) > 0:
            sic_var = np.var(self.raw_sic, axis=0)
            self.miz_weight = np.where(
                sic_var > MODEL["loss"]["miz_variance_threshold"],
                MODEL["loss"]["miz_weight_factor"],
                1.0
            ).astype(np.float32)
        else:
            self.miz_weight = np.ones_like(self.ocean_mask)
        
        print(f"SeaIceDataset [{split}]: {len(self.valid_starts)} samples, "
              f"input={self.K}d, horizon={self.H}d (in-memory cached)")
    
    @staticmethod
    def _normalize(arr: np.ndarray, var_name: str) -> np.ndarray:
        """Standard normalization with robust NaN cleaning."""
        arr = np.nan_to_num(arr, nan=0.0)
        if var_name in ("sic", "sic_mask", "land_mask"):
            return np.clip(arr, 0, 1).astype(np.float32)
        elif var_name == "dist_to_coast":
            return (arr / 2000.0).astype(np.float32)
        elif var_name == "bathy":
            return (arr / 5000.0).astype(np.float32)
        elif var_name in ("u10", "v10"):
            return (arr / 20.0).astype(np.float32)
        elif var_name == "t2m":
            return ((arr - 250.0) / 30.0).astype(np.float32)
        elif var_name == "msl":
            return ((arr - 980.0) / 40.0).astype(np.float32)
        elif var_name == "sst":
            return ((arr - 271.0) / 10.0).astype(np.float32)
        elif var_name in ("wind_speed", "wind_div"):
            return (arr / 15.0).astype(np.float32)
        elif var_name in ("sic_anomaly", "sic_tend_3d", "sic_tend_7d"):
            return np.clip(arr / 0.5, -2.0, 2.0).astype(np.float32)
        elif var_name in ("uo", "vo"):
            return (arr / 0.5).astype(np.float32)
        elif var_name == "zos":
            return (arr / 1.0).astype(np.float32)
        else:
            return arr.astype(np.float32)
    
    def __len__(self):
        return len(self.valid_starts)
    
    def __getitem__(self, idx):
        global_t = self.valid_starts[idx]
        local_t = global_t - self.t_min
        
        # Local input window: local_t - K + 1 ... local_t
        t_start = local_t - self.K + 1
        t_end = local_t + 1
        
        channels = []
        # Temporal loop: K steps
        for step_idx in range(t_start, t_end):
            # 1. SIC
            channels.append(self.cached_vars["sic"][step_idx])
            
            # 2. Driver variables
            for var in self.DRIVER_VARS:
                channels.append(self.cached_vars[var][step_idx])
            
            # 3. Derived variables
            for var in self.DERIVED_VARS:
                channels.append(self.cached_vars[var][step_idx])
            
            # 4. Temporal encodings (broadcast to 2D)
            ny, nx = self.ocean_mask.shape
            sin_doy = np.full((ny, nx), self.cached_sin_doy[step_idx], dtype=np.float32)
            cos_doy = np.full((ny, nx), self.cached_cos_doy[step_idx], dtype=np.float32)
            channels.append(sin_doy)
            channels.append(cos_doy)
        
        # 5. Static channels
        for s in range(self.static.shape[0]):
            channels.append(self.static[s])
        
        input_tensor = np.stack(channels, axis=0)  # (C, H, W)
        
        # Target: SIC for lead days 1–14
        target_start = local_t + 1
        target_end = local_t + self.H + 1
        target = self.raw_sic[target_start:target_end]  # (14, H, W)
        
        return {
            "input": torch.from_numpy(input_tensor),
            "target": torch.from_numpy(target),
            "mask": torch.from_numpy(self.ocean_mask),
            "miz_weight": torch.from_numpy(self.miz_weight),
        }


def get_dataloaders(zarr_path: str, batch_size: int = 4):
    """Create train/val/test dataloaders."""
    from torch.utils.data import DataLoader
    
    train_ds = SeaIceDataset(zarr_path, split="train")
    val_ds = SeaIceDataset(zarr_path, split="val")
    test_ds = SeaIceDataset(zarr_path, split="test")
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False,
                            num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False,
                             num_workers=0)
    
    return train_loader, val_loader, test_loader
