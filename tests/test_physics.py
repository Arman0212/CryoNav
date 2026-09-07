"""
Physics and Iceberg Dynamics Unit Tests.
Verifies Coriolis effects, momentum balance equations, and Monte Carlo ensembles.
"""
import unittest
import numpy as np
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.berg.dynamics import (
    Iceberg,
    coriolis_parameter,
    forces,
    rk4_step,
    empirical_2pct_rule,
    propagate,
)


class TestIcebergPhysics(unittest.TestCase):
    def test_coriolis_parameter_southern_hemisphere(self):
        # Coriolis parameter f = 2Ω sin(lat)
        # At equator: 0
        self.assertAlmostEqual(coriolis_parameter(0.0), 0.0)

        # In Southern Hemisphere (e.g. 65°S), f must be strictly negative
        f_65s = coriolis_parameter(-65.0)
        self.assertLess(f_65s, 0.0)

        # Expected magnitude at 65°S: ~ -1.32e-4 s^-1
        self.assertTrue(-1.4e-4 < f_65s < -1.2e-4)

    def test_coriolis_deflection_direction(self):
        # In Southern Hemisphere, Coriolis force deflects moving bodies to the LEFT
        # Moving East (vx > 0), "Left" is North (vy > 0)
        berg = Iceberg(berg_id="TEST", lat=-65.0, lon=70.0)
        berg.vx = 2.0  # moving east
        berg.vy = 0.0

        # No wind, no current, no sea-ice, flat sea surface
        ax, ay = forces(
            berg,
            wind_u=0.0, wind_v=0.0,
            curr_u=0.0, curr_v=0.0,
            sic=0.0,
            ssh_grad_x=0.0, ssh_grad_y=0.0
        )

        # Acceleration in y (North) should be positive (deflection to the left)
        self.assertGreater(ay, 0.0, "Coriolis force in Southern Hemisphere should deflect to the left (North for Eastward motion)")

    def test_two_percent_rule_baseline(self):
        # 2% rule: v_berg = u_current + 0.02 * u_wind
        def simple_forcing(t_day, lat, lon):
            return {
                "wind_u": 10.0,  # 10 m/s eastward wind
                "wind_v": 0.0,
                "curr_u": 0.5,   # 0.5 m/s eastward current
                "curr_v": 0.0,
                "sic": 0.0,
            }

        res = propagate(
            berg_id="TEST_2PCT",
            start_lat=-65.0,
            start_lon=70.0,
            t0="2023-01-01",
            horizon_days=3,
            forcing_func=simple_forcing,
            method="2pct",
            n_ensemble=1,
        )

        track = res["mean_track"]
        self.assertEqual(len(track), 4)  # Day 0, 1, 2, 3
        # Each entry in mean_track is (day, lat, lon)
        # Since wind and current are eastward, longitude must increase
        self.assertGreater(track[-1][2], track[0][2])

        # Also test direct empirical_2pct_rule function
        new_lat, new_lon = empirical_2pct_rule(
            lat=-65.0, lon=70.0, wind_u=10.0, wind_v=0.0, curr_u=0.5, curr_v=0.0, dt_hours=1.0
        )
        self.assertEqual(new_lat, -65.0)
        self.assertGreater(new_lon, 70.0)

    def test_rk4_ensemble_propagation(self):
        def constant_forcing(t_day, lat, lon):
            return {
                "wind_u": 8.0,
                "wind_v": 2.0,
                "curr_u": 0.2,
                "curr_v": 0.1,
                "sic": 0.1,
                "ssh_grad_x": 0.0,
                "ssh_grad_y": 0.0,
            }

        res = propagate(
            berg_id="ENSEMBLE_TEST",
            start_lat=-65.0,
            start_lon=70.0,
            t0="2023-01-01",
            horizon_days=3,
            forcing_func=constant_forcing,
            n_ensemble=10,
        )

        self.assertIn("mean_track", res)
        self.assertIn("ensemble", res)
        self.assertEqual(res["ensemble"].shape[0], 10)
        # All members should stay in valid Southern Ocean bounds
        self.assertTrue(np.all(res["ensemble"][:, :, 0] <= -50.0))


if __name__ == "__main__":
    unittest.main()
