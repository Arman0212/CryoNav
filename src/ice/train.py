"""
CryoNav — Training loop for the sea-ice U-Net.

MPS (Apple Silicon) / CUDA / CPU support.
Checkpointing, early stopping, cosine LR scheduling.
"""
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
from pathlib import Path
from datetime import datetime
import json, sys, time
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import DOMAIN, MODEL
from src.ice.models import build_model, SeaIceLoss
from src.ice.dataset import SeaIceDataset


def get_device():
    """Select best available device."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def train_epoch(model, loader, criterion, optimizer, device):
    """Train one epoch."""
    model.train()
    total_loss = 0.0
    n_batches = 0
    
    for batch in loader:
        inputs = batch["input"].to(device)
        targets = batch["target"].to(device)
        mask = batch["mask"].to(device)
        miz_w = batch["miz_weight"].to(device)
        
        optimizer.zero_grad()
        preds = model(inputs)
        
        loss, loss_parts = criterion(preds, targets, mask, miz_w)
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), 
                                        MODEL["training"]["gradient_clip"])
        
        optimizer.step()
        
        total_loss += loss.item()
        n_batches += 1
    
    return total_loss / max(n_batches, 1)


def validate_epoch(model, loader, criterion, device):
    """Validate one epoch."""
    model.eval()
    total_loss = 0.0
    n_batches = 0
    
    with torch.no_grad():
        for batch in loader:
            inputs = batch["input"].to(device)
            targets = batch["target"].to(device)
            mask = batch["mask"].to(device)
            miz_w = batch["miz_weight"].to(device)
            
            preds = model(inputs)
            loss, _ = criterion(preds, targets, mask, miz_w)
            
            total_loss += loss.item()
            n_batches += 1
    
    return total_loss / max(n_batches, 1)


def train(zarr_path: str = None, epochs: int = None, quick_test: bool = False):
    """
    Full training pipeline.
    
    Args:
        zarr_path: Path to the Zarr cube
        epochs: Override number of epochs
        quick_test: If True, run only 3 epochs with small data for testing
    """
    if zarr_path is None:
        zarr_path = str(Path(__file__).resolve().parent.parent.parent / 
                       DOMAIN["paths"]["zarr_cube"])
    
    if epochs is None:
        epochs = MODEL["training"]["epochs"]
    
    if quick_test:
        epochs = 3
    
    device = get_device()
    print(f"Training on device: {device}")
    print(f"Epochs: {epochs}")
    
    # Dataset
    batch_size = MODEL["training"]["batch_size"]
    train_ds = SeaIceDataset(zarr_path, split="train")
    val_ds = SeaIceDataset(zarr_path, split="val")
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=0, pin_memory=False)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False,
                            num_workers=0)
    
    # Determine input channels from the dataset
    sample = train_ds[0]
    in_channels = sample["input"].shape[0]
    print(f"Input channels: {in_channels}")
    
    # Model
    model = build_model(in_channels=in_channels)
    model = model.to(device)
    
    # Loss
    criterion = SeaIceLoss(
        l1_weight=MODEL["loss"]["l1_weight"],
        bce_weight=MODEL["loss"]["bce_weight"],
        edge_threshold=MODEL["loss"]["ice_edge_threshold"],
    )
    
    # Optimizer & scheduler
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=MODEL["training"]["learning_rate"],
        weight_decay=MODEL["training"]["weight_decay"],
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=epochs,
    )
    
    # Checkpointing
    ckpt_dir = Path(zarr_path).parent.parent / "results" / "checkpoints"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    
    best_val_loss = np.inf
    patience_counter = 0
    patience = MODEL["training"]["early_stopping_patience"]
    history = {"train_loss": [], "val_loss": [], "lr": []}
    
    print(f"\nTraining {model.count_parameters():,} parameters...")
    print(f"Train samples: {len(train_ds)}, Val samples: {len(val_ds)}")
    print(f"{'Epoch':>6} {'Train':>10} {'Val':>10} {'LR':>12} {'Time':>8} {'Status':>10}")
    print("-" * 62)
    
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        
        train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss = validate_epoch(model, val_loader, criterion, device)
        
        lr = optimizer.param_groups[0]["lr"]
        scheduler.step()
        
        elapsed = time.time() - t0
        
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["lr"].append(lr)
        
        # Check for improvement
        status = ""
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            status = "✓ best"
            
            # Save best checkpoint
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": val_loss,
                "train_loss": train_loss,
                "in_channels": in_channels,
            }, ckpt_dir / "best_model.pt")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                status = "STOP"
        
        print(f"{epoch:>6} {train_loss:>10.6f} {val_loss:>10.6f} "
              f"{lr:>12.2e} {elapsed:>7.1f}s {status:>10}")
        
        if patience_counter >= patience:
            print(f"\nEarly stopping at epoch {epoch} (patience={patience})")
            break
    
    # Save training history
    with open(ckpt_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)
    
    # Save final model
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "in_channels": in_channels,
    }, ckpt_dir / "final_model.pt")
    
    print(f"\nTraining complete. Best val loss: {best_val_loss:.6f}")
    print(f"Checkpoints saved to {ckpt_dir}")
    
    return model, history


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--quick-test", action="store_true")
    parser.add_argument("--zarr", type=str, default=None)
    args = parser.parse_args()
    
    train(zarr_path=args.zarr, epochs=args.epochs, quick_test=args.quick_test)
