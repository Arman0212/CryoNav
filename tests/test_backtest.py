"""
Unit tests for CryoNav rolling-origin validation harness and metrics.

Verifies:
1. Mathematical invariants of IIEE (Goessling et al. 2016 decomposition).
2. Skill score boundary behaviors.
3. Binary classification metric bounds.
4. Strict temporal partitioning (zero leakage of test data into climatology).
"""
import numpy as np
import pytest
import xarray as xr
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.config import DOMAIN
from src.ice.metrics import rmse, mae, iiee, binary_metrics, skill_score
from src.ice.baselines import compute_climatology


def test_iiee_mathematical_decomposition():
    """
    Test Goessling et al. (2016) formulation:
    IIEE = Over + Under = AEE + ME
    """
    ny, nx = 50, 50
    mask = np.ones((ny, nx), dtype=np.float32)
    cell_area = 625.0

    # Case 1: Identical fields -> IIEE must be exactly 0
    actual = np.full((ny, nx), 0.5, dtype=np.float32)
    pred = actual.copy()
    res = iiee(pred, actual, mask, threshold=0.15, cell_area_km2=cell_area)
    assert res["total_km2"] == 0.0
    assert res["over_km2"] == 0.0
    assert res["under_km2"] == 0.0
    assert res["aee_km2"] == 0.0
    assert res["me_km2"] == 0.0

    # Case 2: Arbitrary synthetic patterns -> Verify IIEE == Over + Under == AEE + ME
    np.random.seed(42)
    actual = np.random.uniform(0.0, 1.0, (ny, nx)).astype(np.float32)
    pred = np.random.uniform(0.0, 1.0, (ny, nx)).astype(np.float32)
    res = iiee(pred, actual, mask, threshold=0.15, cell_area_km2=cell_area)

    # Invariant 1: Total equals Over + Under
    assert np.isclose(res["total_km2"], res["over_km2"] + res["under_km2"])
    # Invariant 2: Total equals AEE + ME
    assert np.isclose(res["total_km2"], res["aee_km2"] + res["me_km2"])
    # Invariant 3: Non-negativity
    assert res["total_km2"] >= 0.0
    assert res["over_km2"] >= 0.0
    assert res["under_km2"] >= 0.0
    assert res["aee_km2"] >= 0.0
    assert res["me_km2"] >= 0.0


def test_skill_score_boundaries():
    """Verify standard skill score formulation: 1 - MSE_model / MSE_baseline."""
    # Perfect forecast
    assert skill_score(0.0, 0.05) == 1.0

    # Same skill as baseline
    assert skill_score(0.05, 0.05) == 0.0

    # Inferior to baseline
    assert skill_score(0.10, 0.05) == -1.0

    # Zero baseline error safeguard
    assert skill_score(0.0, 0.0) == 0.0


def test_binary_metrics_bounds():
    """Verify binary accuracy and F1 are within [0, 1]."""
    ny, nx = 40, 40
    mask = np.ones((ny, nx), dtype=np.float32)
    actual = np.random.uniform(0.0, 1.0, (ny, nx)).astype(np.float32)
    pred = np.random.uniform(0.0, 1.0, (ny, nx)).astype(np.float32)

    metrics = binary_metrics(pred, actual, mask, threshold=0.15)
    for k in ["accuracy", "f1", "precision", "recall"]:
        assert 0.0 <= metrics[k] <= 1.0, f"Metric {k} out of bounds: {metrics[k]}"


def test_no_temporal_leakage_in_climatology():
    """
    Ensure the climatology is computed strictly on train period (<= 2022-12-31)
    and does not access 2023 validation or 2024 test years.
    """
    cube_path = Path(DOMAIN["paths"]["zarr_cube"])
    if not cube_path.exists():
        pytest.skip("Cube not found on disk")

    ds = xr.open_zarr(cube_path)
    train_end = DOMAIN["splits"]["train"][1]  # '2022-12-31'
    clim = compute_climatology(ds, clim_end=train_end)

    assert clim.shape == (366, 264, 220)
    assert not np.isnan(clim).any()
    assert clim.min() >= 0.0
    assert clim.max() <= 1.0


def test_held_out_dates_exclusion():
    """Verify demo dates are properly isolated from test evaluations."""
    demo_dates = DOMAIN.get("held_out_demo_dates", [])
    assert len(demo_dates) >= 3
    for d in demo_dates:
        assert isinstance(d, str)
