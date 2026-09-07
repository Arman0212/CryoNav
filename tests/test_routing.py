"""
Routing Engine and POLARIS Cost Model Unit Tests.
"""
import unittest
import numpy as np
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.routing.cost import speed_in_ice, fuel_rate, polaris_rio, cell_cost, compute_cost_grid
from src.routing.astar import astar_route, cell_distance_km, great_circle_heuristic


class TestRoutingCost(unittest.TestCase):
    def test_speed_in_ice_open_water(self):
        # In completely open water (SIC = 0), vessel should achieve full open water speed (14 kn)
        speed = speed_in_ice(np.array([0.0]), v_open_kn=14.0)
        self.assertAlmostEqual(float(speed[0]), 14.0, places=3)

    def test_speed_in_ice_blocked(self):
        # In impenetrable pack ice (SIC >= sic_block, default 0.90), speed should be 0 kn
        speed = speed_in_ice(np.array([0.95]), v_open_kn=14.0, sic_block=0.90)
        self.assertEqual(float(speed[0]), 0.0)

    def test_speed_in_ice_monotonic_decrease(self):
        # Speed should strictly decrease as ice concentration rises
        sics = np.linspace(0, 0.85, 10)
        speeds = speed_in_ice(sics, v_open_kn=14.0)
        for i in range(len(speeds) - 1):
            self.assertGreater(speeds[i], speeds[i + 1])

    def test_fuel_rate_increases_in_ice(self):
        # Fuel consumption in ice must exceed open water at same speed
        ow_fuel = fuel_rate(speed_kn=10.0, sic=0.0)
        ice_fuel = fuel_rate(speed_kn=10.0, sic=0.5)
        self.assertGreater(ice_fuel, ow_fuel)

    def test_polaris_rio_bands(self):
        # Low concentration should give positive RIV
        self.assertGreater(polaris_rio(0.1), 0)
        # 100% thick multi-year pack ice should give -99
        self.assertEqual(polaris_rio(0.99), -99)

    def test_cell_cost_hard_constraints(self):
        # Shallow water (<15m) should be impassable
        shallow = cell_cost(sic=0.0, berg_risk=0.0, bathy=-5.0, cell_dist_km=25.0,
                            w_time=1.0, w_fuel=0.5, w_risk=2.0)
        self.assertFalse(shallow["passable"])
        self.assertEqual(shallow["cost"], np.inf)

        # Extreme SIC (>= 0.90) should be impassable
        heavy_ice = cell_cost(sic=0.92, berg_risk=0.0, bathy=-2000.0, cell_dist_km=25.0,
                              w_time=1.0, w_fuel=0.5, w_risk=2.0)
        self.assertFalse(heavy_ice["passable"])
        self.assertEqual(heavy_ice["cost"], np.inf)

        # Normal navigable water should have finite cost
        normal = cell_cost(sic=0.1, berg_risk=0.0, bathy=-2000.0, cell_dist_km=25.0,
                           w_time=1.0, w_fuel=0.5, w_risk=2.0)
        self.assertTrue(normal["passable"])
        self.assertTrue(np.isfinite(normal["cost"]))


class TestAStarRouting(unittest.TestCase):
    def test_cell_distance_km(self):
        # Orthogonal step on 25km grid
        self.assertAlmostEqual(cell_distance_km(0, 0, 0, 1, 25.0), 25.0)
        # Diagonal step
        self.assertAlmostEqual(cell_distance_km(0, 0, 1, 1, 25.0), 25.0 * np.sqrt(2))

    def test_astar_synthetic_grid(self):
        # Create a mini 20x20 test ocean grid
        ny, nx = 20, 20
        n_days = 7
        sic_fields = np.zeros((n_days, ny, nx), dtype=np.float32)
        berg_risk = np.zeros((n_days, ny, nx), dtype=np.float32)
        bathy = np.full((ny, nx), -2000.0, dtype=np.float32)
        land_mask = np.zeros((ny, nx), dtype=np.float32)
        
        # Add an impassable land obstacle in the middle
        land_mask[8:12, 5:15] = 1.0

        # Lat / lon grids
        lat_grid = np.linspace(-60, -70, ny)[:, None] * np.ones((1, nx))
        lon_grid = np.ones((ny, 1)) * np.linspace(10, 30, nx)[None, :]

        start_yx = (2, 10)
        goal_yx = (18, 10)

        route = astar_route(
            sic_fields=sic_fields,
            berg_risk_field=berg_risk,
            bathy=bathy,
            land_mask=land_mask,
            lat_grid=lat_grid,
            lon_grid=lon_grid,
            start_yx=start_yx,
            goal_yx=goal_yx,
            w_time=1.0,
            w_fuel=0.5,
            w_risk=2.0,
        )

        self.assertTrue(route["success"], "A* pathfinding failed on synthetic ocean grid")
        self.assertGreater(len(route["path_yx"]), 2)
        self.assertEqual(route["path_yx"][0], start_yx)
        self.assertEqual(route["path_yx"][-1], goal_yx)
        self.assertGreater(route["distance_nm"], 0)
        self.assertGreater(route["time_h"], 0)


if __name__ == "__main__":
    unittest.main()
