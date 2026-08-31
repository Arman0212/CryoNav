"""
CryoNav — Sea-ice forecast inference and prediction.

Loads trained checkpoint and produces 14-day SIC forecasts.
Caches predictions for demo dates.
"""
import torch
import numpy as np
import xarray as xr
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, MODEL
from src.ice.models import build_model
from src.ice.dataset import SeaIceDataset


def load_model(checkpoint_path: str = None, device=None):
    """Load trained model from checkpoint."""
    if device is None:
        if torch.cuda.is_available():
            device = torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            device = torch.device("cpu")
    
    if checkpoint_path is None:
        checkpoint_path = str(Path(__file__).resolve().parent.parent.parent / 
                             "results" / "checkpoints" / "best_model.pt")
    
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    in_channels = ckpt.get("in_channels", 94)
    model = build_model(in_channels=in_channels)
    model.load_state_dict(ckpt["model_state_dict"])
    model = model.to(device)
    model.eval()
    
    print(f"Loaded model from {checkpoint_path} (epoch {ckpt.get('epoch', '?')}, "
          f"val_loss={ckpt.get('val_loss', '?'):.6f})")
    
    return model, device


def predict_date(model, device, zarr_path: str, target_date: str,
                 input_window: int = 7) -> np.ndarray:
    """
    Produce a 14-day SIC forecast starting from target_date.
    
    Returns: (14, H, W) array of forecasted SIC.
    """
    ds = xr.open_zarr(zarr_path)
    
    # Find the time index for the target date
    target_dt = np.datetime64(target_date)
    times = ds.time.values
    
    # We need the date that is input_window days before target
    # The forecast will predict days 1–14 from the input state
    input_end_dt = target_dt - np.timedelta64(1, 'D')  # day before target
    
    # Find closest time index
    idx = np.argmin(np.abs(times - input_end_dt))
    
    if idx < input_window - 1:
        raise ValueError(f"Not enough history before {target_date}")
    
    # Create a temporary dataset to get the sample
    test_ds = SeaIceDataset(zarr_path, split="test")
    
    # Build input manually from the zarr
    sample = _build_sample(ds, idx, input_window, test_ds)
    
    # Inference
    with torch.no_grad():
        inputs = sample["input"].unsqueeze(0).to(device)
        pred = model(inputs)
        pred = pred.squeeze(0).cpu().numpy()
    
    return pred


def _build_sample(ds, t_idx, K, ref_dataset):
    """Build a single sample matching the dataset format."""
    channels = []
    
    for t in range(t_idx - K + 1, t_idx + 1):
        sic = ds["sic"].values[t]
        channels.append(ref_dataset._normalize(sic, "sic"))
        
        for var in ref_dataset.DRIVER_VARS:
            val = ds[var].values[t]
            channels.append(ref_dataset._normalize(val, var))
        
        for var in ref_dataset.DERIVED_VARS:
            val = ds[var].values[t]
            channels.append(ref_dataset._normalize(val, var))
        
        sin_doy = np.full_like(sic, ds["sin_doy"].values[t])
        cos_doy = np.full_like(sic, ds["cos_doy"].values[t])
        channels.append(sin_doy)
        channels.append(cos_doy)
    
    # Static channels
    for v in ref_dataset.STATIC_VARS:
        channels.append(ref_dataset._normalize(ds[v].values, v))
    
    input_tensor = np.stack(channels, axis=0)
    
    return {
        "input": torch.from_numpy(input_tensor),
        "mask": torch.from_numpy(ds["sic_mask"].values.astype(np.float32)),
    }


def cache_demo_predictions(model=None, device=None, zarr_path=None):
    """Precompute and cache predictions for all demo dates."""
    if zarr_path is None:
        zarr_path = str(Path(__file__).resolve().parent.parent.parent / 
                       DOMAIN["paths"]["zarr_cube"])
    
    if model is None:
        model, device = load_model()
    
    cache_dir = Path(zarr_path).parent / "demo_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    for demo_date in DOMAIN["held_out_demo_dates"]:
        print(f"  Caching prediction for {demo_date}...")
        try:
            pred = predict_date(model, device, zarr_path, demo_date)
            np.save(cache_dir / f"forecast_{demo_date}.npy", pred)
            print(f"    Saved: shape={pred.shape}, range=[{pred.min():.3f}, {pred.max():.3f}]")
        except Exception as e:
            print(f"    Failed: {e}")
    
    print(f"  Cache directory: {cache_dir}")


if __name__ == "__main__":
    cache_demo_predictions()
