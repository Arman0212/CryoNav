# CryoNav — Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support

<p align="center">
  <strong>AI-enabled sea-ice forecasting · Iceberg drift prediction · Optimal route planning</strong>
</p>

---

## Overview

CryoNav is an integrated decision support system for Antarctic navigation that:

1. **Forecasts sea-ice concentration** 1–14 days ahead using a U-Net trained on the satellite passive-microwave record, with atmospheric and oceanographic drivers
2. **Predicts iceberg drift trajectories** using a physics-based momentum-balance model validated against historical tracking data  
3. **Plans optimal ship routes** across the forecast ice field using time-expanded A* search, where each grid cell is costed by transit difficulty, fuel consumption, and safety risk

All three components are unified behind a single polar map interface with interactive cost-weight sliders.

### Target Stations
- **Bharati Station** (Larsemann Hills, Prydz Bay, 69.4°S 76.2°E)
- **Maitri Station** (Princess Astrid Coast, 70.0°S 11.5°E)

### Domain
Indian Ocean sector of the Southern Ocean: 20°W–120°E, 50°S–78°S. NSIDC 25 km Polar Stereographic grid (EPSG:3412).

---

## Quick Start

### 1. Setup Environment
```bash
git clone https://github.com/Arman0212/CryoNav.git
cd CryoNav
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Dataset Setup (1-Command Download)
The pre-compiled, 8-year analysis-ready Zarr data cube (`2017–2024`, 2,922 days across NASA SIC, ERA5, CMEMS, and BYU Icebergs) is hosted for 1-command setup:

```bash
# Option A: Download from Google Drive (Zero API keys required)
python scripts/download_data.py --gdrive-id <GOOGLE_DRIVE_FILE_ID>

# Option B: Verify existing local datasets
python scripts/download_data.py --verify

# Option C: Synthetic fallback mode (for offline/instant lightweight testing)
PYTHONPATH=. python src/data/synthetic.py
```

### 3. Run Pipeline & Web Interface
```bash
# Run 4 Baselines (Persistence, Climatology, Linear Trend, Anomaly Persistence)
PYTHONPATH=. python src/ice/baselines.py

# Train U-Net Sea-Ice Forecast Model (MPS / CUDA / CPU)
PYTHONPATH=. python src/ice/train.py

# Run Complete Demo Pipeline
PYTHONPATH=. python scripts/run_demo.py --all

# Launch Interactive Polar Navigation Web App
PYTHONPATH=. python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000
# Open http://localhost:8000
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Web Frontend                    │
│   Leaflet Map · Cost Sliders · Route Comparison   │
├──────────────────────────────────────────────────┤
│                  FastAPI Backend                   │
│  /forecast  /observed  /bergs  /route  /metrics   │
├────────────┬─────────────┬───────────────────────┤
│  Sea-Ice   │   Iceberg   │    Routing Engine      │
│  Forecast  │    Drift    │                        │
│            │             │   Time-expanded A*     │
│  U-Net     │  RK4 Mom.   │   over forecast fields │
│  14-day    │  Balance    │                        │
│  multi-head│  + 2% Rule  │   POLARIS-style risk   │
│            │             │   Speed-in-ice curve   │
│  Baselines │  50-member  │   Fuel model           │
│  4 methods │  Ensemble   │   Berg risk field      │
├────────────┴─────────────┴───────────────────────┤
│          Analysis-Ready Zarr Data Cube            │
│  SIC · ERA5 · GLORYS · Bergs · Bathymetry         │
│  25 km Polar Stereo · Daily · 1991–present        │
└──────────────────────────────────────────────────┘
```

---

## Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Grid | NSIDC 25 km Polar Stereo | Native resolution of SIC CDR — never resample the target |
| Forecast horizon | 1–14 days, headline at day 7 | Operationally useful window; honest limit of skill |
| Loss function | L1 + 0.3×BCE on ice edge | Ice edge accuracy matters more than interior pack |
| Router | Time-expanded A* | SIC field advances with ship position — uses forecast, not persistence |
| Cost model | POLARIS-style RIO | IMO standard framing; defensible to a maritime audience |
| Held-out dates | 2019-01-15, 2021-02-10, 2023-01-20 | Three dates across different years; never touched during training |

---

## Data Citations

- Meier, W. N., Fetterer, F., Windnagel, A. K., Stewart, J. S. & Stafford, T. (2026). *NOAA/NSIDC Climate Data Record of Passive Microwave Sea Ice Concentration*, Version 6. NSIDC. https://nsidc.org/data/g02202
- Budge, J. S. & Long, D. G. (2018). *A Comprehensive Database for Antarctic Iceberg Tracking Using Scatterometer Data*, IEEE JSTARS 11(2), 434–442.
- Hersbach, H. et al. *ERA5 hourly data on single levels*, Copernicus Climate Change Service (C3S) Climate Data Store.
- E.U. Copernicus Marine Service Information, *Global Ocean Physics Reanalysis* GLOBAL_MULTIYEAR_PHY_001_030.
- IBCSO v2 / GEBCO 2024 bathymetry.
- IMO POLARIS methodology (MSC.1/Circ.1519) for ice-class risk indexing.

---

## Known Limitations

- **25 km resolution** cannot resolve leads/channels a ship actually uses
- **Passive microwave SIC** degrades during summer surface melt (wet snow on ice appears as lower concentration)
- **Router assumes deterministic ice field** — ensemble robustness partially addresses this
- **Berg drag coefficients are tuned, not measured** — uncertainty quantified via ensemble perturbation
- **Cost model coefficients are illustrative** — real fuel curves require vessel-specific data
- This is **decision support**, not autonomous navigation

---

## Repository Structure

```
CryoNav/
├── config/         domain.yaml  model.yaml  routing.yaml
├── data/           raw/  interim/  processed/antarctic_cube.zarr
├── src/
│   ├── data/       synthetic.py  regrid.py  build_cube.py
│   ├── ice/        baselines.py  dataset.py  models.py  train.py  predict.py  metrics.py
│   ├── berg/       dynamics.py  risk_field.py  ensemble.py  validate.py
│   ├── routing/    cost.py  astar.py  alternatives.py  compare.py
│   └── api/        main.py  cache.py
├── web/            index.html  app.js  styles.css
├── scripts/        run_demo.py  reproduce_all.sh
├── results/        figures + CSV metrics + demo JSON
└── README.md
```

## License

Research and educational use.
