"""
CryoNav — U-Net model for sea-ice concentration forecasting.

v1: Channels-as-time U-Net
  - 4 encoder / 4 decoder blocks
  - GroupNorm + GELU
  - 32 → 256 filters
  - 14-channel sigmoid output (one per lead day)
  - ~10M parameters
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvBlock(nn.Module):
    """Double convolution block with GroupNorm and GELU."""
    
    def __init__(self, in_ch, out_ch, num_groups=8, dropout=0.1):
        super().__init__()
        # Ensure num_groups divides channel count
        g1 = min(num_groups, out_ch)
        while out_ch % g1 != 0:
            g1 -= 1
        
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(g1, out_ch),
            nn.GELU(),
            nn.Dropout2d(dropout),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.GroupNorm(g1, out_ch),
            nn.GELU(),
        )
    
    def forward(self, x):
        return self.conv(x)


class DownBlock(nn.Module):
    """Encoder block: MaxPool + ConvBlock."""
    
    def __init__(self, in_ch, out_ch, num_groups=8, dropout=0.1):
        super().__init__()
        self.pool = nn.MaxPool2d(2)
        self.conv = ConvBlock(in_ch, out_ch, num_groups, dropout)
    
    def forward(self, x):
        x = self.pool(x)
        return self.conv(x)


class UpBlock(nn.Module):
    """Decoder block: Upsample + Concat skip + ConvBlock."""
    
    def __init__(self, in_ch, skip_ch, out_ch, num_groups=8, dropout=0.1):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, in_ch // 2, 2, stride=2)
        self.conv = ConvBlock(in_ch // 2 + skip_ch, out_ch, num_groups, dropout)
    
    def forward(self, x, skip):
        x = self.up(x)
        
        # Handle size mismatch from non-power-of-2 inputs
        if x.shape != skip.shape:
            diff_h = skip.shape[2] - x.shape[2]
            diff_w = skip.shape[3] - x.shape[3]
            x = F.pad(x, [diff_w // 2, diff_w - diff_w // 2,
                         diff_h // 2, diff_h - diff_h // 2])
        
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class SeaIceUNet(nn.Module):
    """
    U-Net for multi-lead sea-ice concentration forecasting.
    
    Input: (B, C_in, H, W) — stacked temporal channels
    Output: (B, 14, H, W) — SIC forecast for lead days 1–14
    """
    
    def __init__(self, in_channels: int, out_channels: int = 14,
                 base_filters: int = 32, num_groups: int = 8,
                 dropout: float = 0.1):
        super().__init__()
        
        f = base_filters  # 32
        
        # Encoder
        self.inc = ConvBlock(in_channels, f, num_groups, dropout)
        self.down1 = DownBlock(f, f * 2, num_groups, dropout)      # 64
        self.down2 = DownBlock(f * 2, f * 4, num_groups, dropout)  # 128
        self.down3 = DownBlock(f * 4, f * 8, num_groups, dropout)  # 256
        self.down4 = DownBlock(f * 8, f * 8, num_groups, dropout)  # 256 (bottleneck)
        
        # Decoder
        self.up1 = UpBlock(f * 8, f * 8, f * 4, num_groups, dropout)  # 128
        self.up2 = UpBlock(f * 4, f * 4, f * 2, num_groups, dropout)  # 64
        self.up3 = UpBlock(f * 2, f * 2, f, num_groups, dropout)      # 32
        self.up4 = UpBlock(f, f, f, num_groups, dropout)               # 32
        
        # Output head: 14 channels (one per lead day) with sigmoid
        self.outc = nn.Sequential(
            nn.Conv2d(f, out_channels, 1),
            nn.Sigmoid()
        )
        
        self._init_weights()
    
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d) or isinstance(m, nn.ConvTranspose2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='linear')
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
    
    def forward(self, x):
        # Encoder
        x1 = self.inc(x)     # (B, 32, H, W)
        x2 = self.down1(x1)  # (B, 64, H/2, W/2)
        x3 = self.down2(x2)  # (B, 128, H/4, W/4)
        x4 = self.down3(x3)  # (B, 256, H/8, W/8)
        x5 = self.down4(x4)  # (B, 256, H/16, W/16)
        
        # Decoder with skip connections
        x = self.up1(x5, x4)  # (B, 128, H/8, W/8)
        x = self.up2(x, x3)   # (B, 64, H/4, W/4)
        x = self.up3(x, x2)   # (B, 32, H/2, W/2)
        x = self.up4(x, x1)   # (B, 32, H, W)
        
        return self.outc(x)   # (B, 14, H, W)
    
    def count_parameters(self):
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


class SeaIceLoss(nn.Module):
    """
    Combined loss: L1 + BCE on ice edge, with MIZ upweighting.
    
    L = w_l1 * L1(pred, target) + w_bce * BCE(pred > 0.15, target > 0.15)
    Both masked to ocean-only cells and weighted by MIZ importance.
    """
    
    def __init__(self, l1_weight=1.0, bce_weight=0.3, edge_threshold=0.15):
        super().__init__()
        self.l1_weight = l1_weight
        self.bce_weight = bce_weight
        self.edge_threshold = edge_threshold
    
    def forward(self, pred, target, mask, miz_weight=None):
        """
        Args:
            pred: (B, 14, H, W) predicted SIC
            target: (B, 14, H, W) actual SIC
            mask: (B, H, W) or (H, W) ocean mask (1 = valid)
            miz_weight: (B, H, W) or (H, W) MIZ upweighting
        """
        if mask.dim() == 2:
            mask = mask.unsqueeze(0).unsqueeze(0)  # (1, 1, H, W)
        elif mask.dim() == 3:
            mask = mask.unsqueeze(1)  # (B, 1, H, W)
        
        if miz_weight is not None:
            if miz_weight.dim() == 2:
                miz_weight = miz_weight.unsqueeze(0).unsqueeze(0)
            elif miz_weight.dim() == 3:
                miz_weight = miz_weight.unsqueeze(1)
        else:
            miz_weight = torch.ones_like(mask)
        
        weight = mask * miz_weight
        
        # L1 loss on SIC values
        l1 = (torch.abs(pred - target) * weight).sum() / weight.sum().clamp(min=1)
        
        # BCE on ice-edge indicator (SIC >= 15%)
        pred_edge = pred.clamp(1e-6, 1 - 1e-6)
        target_edge = (target >= self.edge_threshold).float()
        bce = F.binary_cross_entropy(pred_edge, target_edge, reduction='none')
        bce = (bce * weight).sum() / weight.sum().clamp(min=1)
        
        total = self.l1_weight * l1 + self.bce_weight * bce
        
        return total, {"l1": l1.item(), "bce": bce.item(), "total": total.item()}


def build_model(in_channels: int = None) -> SeaIceUNet:
    """Build model from config."""
    from src.config import MODEL as M
    
    if in_channels is None:
        K = M["architecture"]["input_window"]
        n_temporal = (M["architecture"]["sic_channels"] + 
                     M["architecture"]["driver_channels"] +
                     M["architecture"]["derived_channels"] + 2)  # +2 for sin/cos doy
        n_static = M["architecture"]["static_channels"]
        in_channels = K * n_temporal + n_static
    
    model = SeaIceUNet(
        in_channels=in_channels,
        out_channels=M["architecture"]["output_channels"],
        base_filters=M["architecture"]["encoder_channels"][0],
        num_groups=M["architecture"]["num_groups"],
        dropout=M["architecture"]["dropout"],
    )
    
    print(f"SeaIceUNet: {model.count_parameters():,} parameters, "
          f"in_channels={in_channels}")
    
    return model
