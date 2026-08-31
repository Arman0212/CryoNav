"""
CryoNav — PyTorch Dataset for sea-ice concentration forecasting.

Input: K=7 days of SIC + drivers + static channels
Output: SIC for lead days 1–14, shape (14, H, W)

Strict temporal split:
  train: 1991–2015
  val:   2016–2018
  test:  2019+

ASSERTION: held-out demo dates are NEVER in any sample's window.
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
    Sea-ice concentration forecast dataset.
    
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
        for demo_date in DOMAIN["held_out_demo_dates"]:
            d = np.datetime64(demo_date)
            # Exclude any date within K + H days of the demo date
            for offset in range(-self.K, self.H + 1):
                excl = d + np.timedelta64(offset, 'D')
                self.held_out_dates.add(excl)
        
        # Build valid start indices
        # A valid start index i means:
        #   - days i-K+1 ... i are input
        #   - days i+1 ... i+H are targets
        #   - All of these are within the split
        #   - None of them are held-out
        self.valid_starts = []
        for idx in self.split_indices:
            if idx < self.K - 1:
                continue
            if idx + self.H >= len(all_times):
                continue
            
            # Check held-out exclusion
            window_times = all_times[idx - self.K + 1: idx + self.H + 1]
            excluded = any(t in self.held_out_dates for t in window_times)
            
            # ASSERTION: held-out dates never touched
            if excluded:
                continue
            
            self.valid_starts.append(idx)
        
        self.valid_starts = np.array(self.valid_starts)
        
        # Preload static fields
        self.ocean_mask = self.ds["sic_mask"].values.astype(np.float32)
        self.static = np.stack([
            self._normalize(self.ds[v].values, v) for v in self.STATIC_VARS
        ], axis=0)  # (n_static, H, W)
        
        # Compute MIZ weight map (cells with high SIC variance)
        # Use training period SIC to compute variance
        if split == "train":
            sic_train = self.ds["sic"].sel(
                time=slice(DOMAIN["splits"]["train"][0], DOMAIN["splits"]["train"][1])
            )
            sic_var = sic_train.var(dim="time").values
            self.miz_weight = np.where(
                sic_var > MODEL["loss"]["miz_variance_threshold"],
                MODEL["loss"]["miz_weight_factor"],
                1.0
            ).astype(np.float32)
        else:
            self.miz_weight = np.ones_like(self.ocean_mask)
        
        print(f"SeaIceDataset [{split}]: {len(self.valid_starts)} samples, "
              f"input={self.K}d, horizon={self.H}d, "
              f"excluded {len(self.held_out_dates)} held-out dates")
    
    def _normalize(self, arr: np.ndarray, var_name: str) -> np.ndarray:
        """Simple normalization to [0, 1] or standard scaling."""
        if var_name in ("sic", "sic_mask", "land_mask"):
            return arr.astype(np.float32)
        elif var_name == "dist_to_coast":
            return (arr / 2000.0).astype(np.float32)  # normalize by ~2000 km
        elif var_name == "bathy":
            return (arr / 5000.0).astype(np.float32)  # normalize by ~5000 m
        elif var_name in ("u10", "v10"):
            return (arr / 20.0).astype(np.float32)  # normalize by ~20 m/s
        elif var_name == "t2m":
            return ((arr - 250.0) / 30.0).astype(np.float32)
        elif var_name == "msl":
            return ((arr - 980.0) / 40.0).astype(np.float32)
        elif var_name == "sst":
            return ((arr - 271.0) / 10.0).astype(np.float32)
        elif var_name in ("wind_speed", "wind_div"):
            return (arr / 15.0).astype(np.float32)
        elif var_name in ("sic_anomaly", "sic_tend_3d", "sic_tend_7d"):
            return (arr / 0.5).astype(np.float32)  # anomalies typically [-0.5, 0.5]
        elif var_name in ("uo", "vo"):
            return (arr / 0.5).astype(np.float32)
        elif var_name == "zos":
            return (arr / 1.0).astype(np.float32)
        else:
            return arr.astype(np.float32)
    
    def __len__(self):
        return len(self.valid_starts)
    
    def __getitem__(self, idx):
        t_idx = self.valid_starts[idx]
        
        # Input window: t_idx - K + 1 ... t_idx
        input_slices = slice(t_idx - self.K + 1, t_idx + 1)
        
        # Stack SIC + drivers + derived for each time step
        channels = []
        for t in range(t_idx - self.K + 1, t_idx + 1):
            # SIC
            sic = self.ds["sic"].values[t]
            channels.append(self._normalize(sic, "sic"))
            
            # Driver variables
            for var in self.DRIVER_VARS:
                val = self.ds[var].values[t]
                channels.append(self._normalize(val, var))
            
            # Derived variables
            for var in self.DERIVED_VARS:
                val = self.ds[var].values[t]
                channels.append(self._normalize(val, var))
            
            # Temporal encoding (broadcast to 2D)
            sin_doy = np.full_like(sic, self.ds["sin_doy"].values[t])
            cos_doy = np.full_like(sic, self.ds["cos_doy"].values[t])
            channels.append(sin_doy)
            channels.append(cos_doy)
        
        # Add static channels (same for all time steps)
        for s in range(self.static.shape[0]):
            channels.append(self.static[s])
        
        input_tensor = np.stack(channels, axis=0)  # (C, H, W)
        
        # Target: SIC for lead days 1–14
        target_slices = slice(t_idx + 1, t_idx + self.H + 1)
        target = self.ds["sic"].values[target_slices]  # (H, ny, nx)
        target = np.clip(target, 0, 1).astype(np.float32)
        
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
