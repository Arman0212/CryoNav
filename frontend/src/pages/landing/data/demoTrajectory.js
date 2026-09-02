/* ═══════════════════════════════════════════════════════════════
   demoTrajectory — REAL CryoNav backend geometry, baked at build time.

   Generated from the live API (GET /bergs, POST /route, GET /observed)
   on the held-out demo date 2023-01-20, then projected into scene space:

     · A window of the real `balanced` corridor around the point where it
       passes closest to BERG_001 — true bearing and shape preserved.
     · The real `min_ice` corridor as the genuine alternative route. The
       re-route in this experience is the router's own answer, not art.
     · The berg's real `mean_track`, and an uncertainty radius per step
       taken from the real 10-member drift ensemble.

   One deliberate distortion, stated plainly: berg drift is amplified
   26x so that 48 hours of real movement (a few km) reads at the scale of
   the scene. Bearings, relative timing and route shape are untouched.
   The HUD labels the experience as a visualisation for this reason.

   This snapshot is the offline fallback — MissionController prefers live
   API data when the backend is reachable.
   ═══════════════════════════════════════════════════════════════ */

const demoTrajectory = {
  "source": "CryoNav backend \u2014 GET /bergs, POST /route, GET /observed (2023-01-20)",
  "anchor": {
    "lat": -58.4474,
    "lon": 45.8447
  },
  "sceneScale": 0.5754,
  "driftAmplification": 26.0,
  "route": [
    [
      -300.0,
      -158.14
    ],
    [
      -278.57,
      -144.59
    ],
    [
      -257.14,
      -131.04
    ],
    [
      -214.29,
      -103.94
    ],
    [
      -192.86,
      -90.4
    ],
    [
      -171.43,
      -76.85
    ],
    [
      -150.0,
      -63.3
    ],
    [
      -107.14,
      -37.05
    ],
    [
      -85.71,
      -25.83
    ],
    [
      -64.29,
      -16.73
    ],
    [
      -42.86,
      -9.22
    ],
    [
      -21.43,
      -2.34
    ],
    [
      21.43,
      11.21
    ],
    [
      42.86,
      17.99
    ],
    [
      64.29,
      24.76
    ],
    [
      85.71,
      31.64
    ],
    [
      107.14,
      39.15
    ],
    [
      150.0,
      59.48
    ],
    [
      171.43,
      72.28
    ],
    [
      192.86,
      85.73
    ],
    [
      214.29,
      99.27
    ],
    [
      257.14,
      126.37
    ],
    [
      278.57,
      139.92
    ],
    [
      300.0,
      153.46
    ]
  ],
  "altRoute": [
    [
      600.0,
      -192.01
    ],
    [
      600.0,
      -178.46
    ],
    [
      600.0,
      -158.14
    ],
    [
      600.0,
      -144.59
    ],
    [
      600.0,
      -131.04
    ],
    [
      600.0,
      -110.72
    ],
    [
      600.0,
      -97.17
    ],
    [
      600.0,
      -83.62
    ],
    [
      600.0,
      -63.3
    ],
    [
      600.0,
      -49.75
    ],
    [
      600.0,
      -36.21
    ],
    [
      600.0,
      -15.88
    ],
    [
      600.0,
      -2.34
    ],
    [
      600.0,
      17.99
    ],
    [
      600.0,
      31.53
    ],
    [
      600.0,
      45.08
    ],
    [
      600.0,
      65.4
    ],
    [
      600.0,
      78.95
    ],
    [
      600.0,
      92.5
    ],
    [
      600.0,
      112.82
    ],
    [
      600.0,
      126.37
    ],
    [
      600.0,
      139.92
    ],
    [
      602.68,
      161.09
    ],
    [
      624.11,
      181.41
    ]
  ],
  "berg": {
    "id": "BERG_001",
    "lengthM": 2646,
    "widthM": 1137,
    "track": [
      {
        "t": 0,
        "pos": [
          -212.71,
          419.11
        ]
      },
      {
        "t": 24,
        "pos": [
          122.68,
          469.94
        ]
      },
      {
        "t": 48,
        "pos": [
          485.85,
          521.17
        ]
      },
      {
        "t": 72,
        "pos": [
          867.28,
          572.02
        ]
      },
      {
        "t": 96,
        "pos": [
          1252.66,
          623.09
        ]
      },
      {
        "t": 120,
        "pos": [
          1625.54,
          674.7
        ]
      },
      {
        "t": 144,
        "pos": [
          1971.45,
          726.01
        ]
      },
      {
        "t": 168,
        "pos": [
          2288.1,
          777.23
        ]
      }
    ],
    "spread": [
      0.0,
      4.96,
      8.11,
      11.33,
      14.02,
      15.71,
      15.24,
      16.33
    ],
    "members": 10
  },
  "seaIce": 0.1931,
  "metrics": {
    "min_ice": {
      "distance_nm": 3147.6,
      "time_h": 240.5,
      "fuel_t": 276.3,
      "ice_h": 43.6
    },
    "balanced": {
      "distance_nm": 2778.8,
      "time_h": 211.4,
      "fuel_t": 247.4,
      "ice_h": 54.6
    }
  }
};

export default demoTrajectory;
