"""
CryoNav — Canonical Domain Definition (EPSG:3031, 25 km Grid).

Domain: Southern Ocean, 60°S–78°S, full longitude (0°–360° / -180°–180°).
Projection: EPSG:3031 (WGS 84 / Antarctic Polar Stereographic).
Standard Parallel: 71°S, Central Meridian: 0°E.
Resolution: 25,000 m (25 km).

All routing and geospatial calculations are computed in polar stereographic metres.
"""
from dataclasses import dataclass
from typing import Tuple, Union
import numpy as np
import pyproj

from src.config import DOMAIN


@dataclass(frozen=True)
class PolarDomain:
    """Canonical EPSG:3031 25 km grid domain for the Southern Ocean."""
    epsg: int = 3031
    resolution_m: float = 25000.0
    x_min: float = -3350000.0
    x_max: float = 3350000.0
    y_min: float = -3350000.0
    y_max: float = 3350000.0
    lat_min: float = -78.0
    lat_max: float = -60.0

    def __post_init__(self):
        # Validation checks on initialization
        if self.lat_min >= self.lat_max:
            raise ValueError(f"lat_min ({self.lat_min}) must be < lat_max ({self.lat_max})")
        if self.x_min >= self.x_max or self.y_min >= self.y_max:
            raise ValueError("Extent boundaries must satisfy min < max")

    @property
    def crs(self) -> pyproj.CRS:
        return pyproj.CRS.from_epsg(self.epsg)

    @property
    def transformer_to_proj(self) -> pyproj.Transformer:
        return pyproj.Transformer.from_crs("EPSG:4326", f"EPSG:{self.epsg}", always_xy=True)

    @property
    def transformer_to_lonlat(self) -> pyproj.Transformer:
        return pyproj.Transformer.from_crs(f"EPSG:{self.epsg}", "EPSG:4326", always_xy=True)

    @property
    def x_coords(self) -> np.ndarray:
        """1D X coordinate array in meters."""
        return np.arange(self.x_min, self.x_max + 0.5 * self.resolution_m, self.resolution_m, dtype=np.float64)

    @property
    def y_coords(self) -> np.ndarray:
        """1D Y coordinate array in meters (descending for north-to-south matrix order)."""
        return np.arange(self.y_max, self.y_min - 0.5 * self.resolution_m, -self.resolution_m, dtype=np.float64)

    @property
    def shape(self) -> Tuple[int, int]:
        """(height, width) of the grid."""
        return len(self.y_coords), len(self.x_coords)

    def get_meshgrids(self) -> Tuple[np.ndarray, np.ndarray]:
        """2D (X, Y) coordinate grids in EPSG:3031 meters."""
        return np.meshgrid(self.x_coords, self.y_coords)

    def get_latlon_grids(self) -> Tuple[np.ndarray, np.ndarray]:
        """2D (lat, lon) arrays across the grid."""
        xx, yy = self.get_meshgrids()
        lons, lats = self.transformer_to_lonlat.transform(xx, yy)
        return lats, lons

    def get_domain_mask(self) -> np.ndarray:
        """
        Boolean mask: True where cell is within 60°S to 78°S.
        Shape: (ny, nx).
        """
        lats, _ = self.get_latlon_grids()
        return (lats >= self.lat_min) & (lats <= self.lat_max)

    def lonlat_to_xy(self, lon: Union[float, np.ndarray], lat: Union[float, np.ndarray]) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
        """Transform (lon, lat) in degrees to (x, y) in EPSG:3031 meters."""
        return self.transformer_to_proj.transform(lon, lat)

    def xy_to_lonlat(self, x: Union[float, np.ndarray], y: Union[float, np.ndarray]) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
        """Transform (x, y) in EPSG:3031 meters to (lon, lat) in degrees."""
        return self.transformer_to_lonlat.transform(x, y)

    def is_in_domain(self, lon: float, lat: float) -> bool:
        """Check if a point falls within the Southern Ocean domain (60°S–78°S)."""
        return bool(self.lat_min <= lat <= self.lat_max)


# Global singleton domain instance matching config/domain.yaml
DOMAIN_CONFIG = DOMAIN.get("projection", {})
CANONICAL_DOMAIN = PolarDomain(
    epsg=int(DOMAIN_CONFIG.get("epsg", 3031)),
    resolution_m=float(DOMAIN_CONFIG.get("resolution_m", 25000.0)),
    x_min=float(DOMAIN_CONFIG.get("extent_m", [-3350000.0, 3350000.0, -3350000.0, 3350000.0])[0]),
    x_max=float(DOMAIN_CONFIG.get("extent_m", [-3350000.0, 3350000.0, -3350000.0, 3350000.0])[1]),
    y_min=float(DOMAIN_CONFIG.get("extent_m", [-3350000.0, 3350000.0, -3350000.0, 3350000.0])[2]),
    y_max=float(DOMAIN_CONFIG.get("extent_m", [-3350000.0, 3350000.0, -3350000.0, 3350000.0])[3]),
    lat_min=float(DOMAIN.get("region", {}).get("lat_min", -78.0)),
    lat_max=float(DOMAIN.get("region", {}).get("lat_max", -60.0)),
)
