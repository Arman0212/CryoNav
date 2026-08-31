"""
CryoNav — Per-cell traversal cost model.

Costs each grid cell by transit difficulty rather than distance alone.
POLARIS-style risk framing (IMO MSC.1/Circ.1519).

Speed-in-ice: v(SIC) = v_open × (1 − (SIC/SIC_block)^p)
Fuel rate: open-water cubic + ice resistance
Berg risk integration from KDE field
"""
import numpy as np
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import ROUTING, DOMAIN

CFG_SPEED = ROUTING["speed_model"]
CFG_FUEL = ROUTING["fuel_model"]
CFG_POLARIS = ROUTING["polaris"]
CFG_CONSTRAINTS = ROUTING["constraints"]


def speed_in_ice(sic: np.ndarray, v_open_kn: float = None,
                 sic_block: float = None, p: float = None) -> np.ndarray:
    """
    Attainable speed as a function of SIC for PC6/IA Super vessel.
    
    v(SIC) = v_open × (1 − (SIC / SIC_block)^p)  for SIC < SIC_block
    v(SIC) = 0                                    for SIC >= SIC_block
    
    Returns speed in knots.
    """
    if v_open_kn is None:
        v_open_kn = CFG_SPEED["v_open_kn"]
    if sic_block is None:
        sic_block = CFG_SPEED["sic_block"]
    if p is None:
        p = CFG_SPEED["power_exponent"]
    
    sic = np.clip(sic, 0, 1)
    speed = np.where(
        sic < sic_block,
        v_open_kn * (1.0 - (sic / sic_block) ** p),
        0.0
    )
    return np.maximum(speed, 0.0)


def fuel_rate(speed_kn: float, sic: float) -> float:
    """
    Fuel consumption rate in tonnes per hour.
    
    Open water: a + b*v + c*v³
    Ice resistance: d × SIC × (1 + thickness_factor)
    """
    ow = CFG_FUEL["open_water_coeffs"]
    rate = ow["a"] + ow["b"] * speed_kn + ow["c"] * speed_kn**3
    
    if sic > 0.01:
        rate += CFG_FUEL["ice_resistance_coeff"] * sic * (1 + CFG_FUEL["thickness_factor"])
    
    return max(rate, 0.1)  # minimum idle consumption


def polaris_rio(sic: float) -> int:
    """
    POLARIS Risk Index Outcome for the given SIC.
    Positive = acceptable, negative = elevated risk, -99 = no-go.
    """
    for band in CFG_POLARIS["concentration_bands"]:
        if sic <= band["sic_max"]:
            return band["riv"]
    return -99


def cell_cost(sic: float, berg_risk: float, bathy: float,
              cell_dist_km: float, w_time: float, w_fuel: float, w_risk: float,
              v_open_kn: float = None) -> dict:
    """
    Compute traversal cost for a single grid cell.
    
    Returns dict with:
        cost: total weighted cost (inf if impassable)
        time_h: transit time in hours
        fuel_t: fuel consumption in tonnes
        speed_kn: attainable speed
        risk_score: combined ice + berg risk
        passable: bool
        reason: rejection reason if impassable
    """
    if v_open_kn is None:
        v_open_kn = CFG_SPEED["v_open_kn"]
    
    cell_dist_nm = cell_dist_km * 0.539957  # km to nautical miles
    
    # Check hard constraints
    if bathy > -CFG_CONSTRAINTS["min_depth_m"] and bathy != 0:
        return {"cost": np.inf, "passable": False, "reason": "Too shallow",
                "time_h": np.inf, "fuel_t": 0, "speed_kn": 0, "risk_score": 0}
    
    if sic >= CFG_CONSTRAINTS["max_sic_traversal"]:
        return {"cost": np.inf, "passable": False, "reason": f"SIC={sic:.0%} impassable",
                "time_h": np.inf, "fuel_t": 0, "speed_kn": 0, "risk_score": 0}
    
    if berg_risk > CFG_CONSTRAINTS["berg_risk_cutoff"]:
        return {"cost": np.inf, "passable": False, "reason": "Berg risk too high",
                "time_h": np.inf, "fuel_t": 0, "speed_kn": 0, "risk_score": 0}
    
    # Speed
    spd = speed_in_ice(np.array([sic]), v_open_kn)[0]
    if spd < 0.5:
        return {"cost": np.inf, "passable": False, "reason": "Speed < 0.5 kn",
                "time_h": np.inf, "fuel_t": 0, "speed_kn": spd, "risk_score": 0}
    
    # Time
    time_h = cell_dist_nm / spd
    
    # Fuel
    fuel = fuel_rate(spd, sic) * time_h
    
    # Risk
    ice_risk = max(0, sic - 0.15) / 0.75  # 0 at 15%, 1 at 90%
    risk_score = ice_risk + berg_risk
    
    # Total cost
    cost = (w_time * time_h + 
            w_fuel * fuel + 
            w_risk * risk_score)
    
    return {
        "cost": cost,
        "passable": True,
        "time_h": time_h,
        "fuel_t": fuel,
        "speed_kn": spd,
        "risk_score": risk_score,
        "reason": None,
    }


def compute_cost_grid(sic_field: np.ndarray, berg_risk_field: np.ndarray,
                      bathy: np.ndarray, land_mask: np.ndarray,
                      w_time: float = 1.0, w_fuel: float = 0.5, w_risk: float = 2.0,
                      cell_size_km: float = 25.0) -> np.ndarray:
    """
    Compute cost grid for all cells.
    
    Returns: (ny, nx) array of traversal costs (inf for impassable).
    """
    ny, nx = sic_field.shape
    costs = np.full((ny, nx), np.inf, dtype=np.float64)
    
    for y in range(ny):
        for x in range(nx):
            if land_mask[y, x] > 0.5:
                continue
            
            result = cell_cost(
                sic=float(sic_field[y, x]),
                berg_risk=float(berg_risk_field[y, x]) if berg_risk_field is not None else 0,
                bathy=float(bathy[y, x]),
                cell_dist_km=cell_size_km,
                w_time=w_time, w_fuel=w_fuel, w_risk=w_risk,
            )
            costs[y, x] = result["cost"]
    
    return costs
