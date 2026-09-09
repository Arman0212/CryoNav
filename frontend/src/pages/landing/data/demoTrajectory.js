/* ═══ demoTrajectory — REAL CryoNav backend geometry, baked at build time.

   Regenerated against the merged backend (2017–2024 cube, 50-member drift
   ensemble) from GET /bergs, POST /route and GET /observed on 2023-01-13:

     · A window of the real `balanced` corridor around the point where it
       passes closest to A23A — true bearing and shape preserved.
     · The real `min_ice` corridor as the alternative route. The re-route
       in this experience is the router's own answer, not art.
     · The berg's real mean_track, with an uncertainty radius per step
       derived from the real 50-member ensemble spread.

   One deliberate distortion, stated plainly: berg drift is amplified 26x
   so 48 hours of real movement (a few km) reads at scene scale. Bearings,
   relative timing and route shape are untouched — which is why the HUD
   labels the experience a visualisation.

   Offline fallback; MissionController prefers live API data when reachable.
   ═══ */

const demoTrajectory = {
  "source": "CryoNav backend \u2014 GET /bergs, POST /route, GET /observed (2023-01-13)",
  "anchor": {
    "lat": -61.3726,
    "lon": 34.9718
  },
  "sceneScale": 0.811,
  "driftAmplification": 26.0,
  "route": [
    [
      -167.15,
      -228.73
    ],
    [
      -157.84,
      -212.26
    ],
    [
      -148.41,
      -195.81
    ],
    [
      -129.2,
      -162.98
    ],
    [
      -119.41,
      -146.61
    ],
    [
      -109.5,
      -130.26
    ],
    [
      -99.46,
      -113.95
    ],
    [
      -79.0,
      -81.4
    ],
    [
      -68.57,
      -65.17
    ],
    [
      -58.0,
      -48.98
    ],
    [
      -47.3,
      -32.82
    ],
    [
      -36.46,
      -16.69
    ],
    [
      -14.35,
      15.45
    ],
    [
      -3.07,
      31.47
    ],
    [
      8.35,
      47.45
    ],
    [
      19.92,
      63.39
    ],
    [
      31.65,
      79.28
    ],
    [
      59.23,
      111.41
    ],
    [
      81.51,
      128.4
    ],
    [
      113.24,
      146.31
    ],
    [
      151.82,
      164.64
    ],
    [
      227.79,
      199.67
    ],
    [
      262.43,
      216.05
    ],
    [
      300.0,
      232.0
    ]
  ],
  "altRoute": [
    [
      228.6,
      -275.88
    ],
    [
      251.6,
      -246.66
    ],
    [
      274.67,
      -217.22
    ],
    [
      296.56,
      -186.33
    ],
    [
      316.84,
      -153.59
    ],
    [
      337.66,
      -121.02
    ],
    [
      361.16,
      -90.68
    ],
    [
      386.94,
      -62.19
    ],
    [
      413.74,
      -34.34
    ],
    [
      441.13,
      -6.76
    ],
    [
      469.15,
      20.56
    ],
    [
      497.79,
      47.58
    ],
    [
      527.07,
      74.31
    ],
    [
      556.58,
      101.2
    ],
    [
      585.05,
      129.65
    ],
    [
      612.08,
      160.11
    ],
    [
      639.82,
      190.27
    ],
    [
      670.43,
      217.79
    ],
    [
      703.49,
      243.1
    ],
    [
      737.72,
      267.56
    ]
  ],
  "berg": {
    "id": "A23A",
    "lengthM": 74080,
    "widthM": 62968,
    "track": [
      {
        "t": 0,
        "pos": [
          -3550.69,
          964.96
        ]
      },
      {
        "t": 24,
        "pos": [
          -3551.81,
          1038.45
        ]
      },
      {
        "t": 48,
        "pos": [
          -3525.26,
          1133.07
        ]
      },
      {
        "t": 72,
        "pos": [
          -3506.0,
          1240.06
        ]
      },
      {
        "t": 96,
        "pos": [
          -3494.92,
          1332.61
        ]
      },
      {
        "t": 120,
        "pos": [
          -3488.3,
          1428.56
        ]
      },
      {
        "t": 144,
        "pos": [
          -3488.7,
          1528.26
        ]
      },
      {
        "t": 168,
        "pos": [
          -3473.17,
          1638.84
        ]
      }
    ],
    "spread": [
      0.0,
      1.94,
      3.72,
      3.81,
      5.47,
      5.28,
      5.24,
      6.79
    ],
    "members": 50
  },
  "seaIce": 0.0583,
  "metrics": {
    "min_ice": {
      "distance_nm": 3214.8,
      "time_h": 231.1,
      "fuel_t": 246.7,
      "ice_h": 3.2
    },
    "balanced": {
      "distance_nm": 3049.1,
      "time_h": 219.1,
      "fuel_t": 233.3,
      "ice_h": 3.2
    }
  }
};

export default demoTrajectory;
