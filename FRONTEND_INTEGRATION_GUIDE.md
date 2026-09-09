# CryoNav — Frontend Integration & Developer / AI Agent Guide

> **Note for Developers & AI Agents Scanning this Codebase**:
> If you are working on the **frontend** (UI, map visualizations, sliders, routing display, responsive layout) or if you are an AI coding assistant on the frontend developer's laptop:
> - **You do NOT need to download the 5.4 GB Zarr data cube.**
> - **You do NOT need a GPU, PyTorch, or deep learning environment.**
> - **You do NOT even need to run the Python backend if you use frozen fixtures.**
> 
> Everything the frontend needs is pre-packaged, documented, and ready for offline or live development.

---

## 1. Quick Start for Frontend Development

### Mode A: Zero-Dependency Fixture Mode (Recommended for Frontend)
All API responses have been pre-computed and saved as JSON in `web/fixtures/`. You can develop the entire frontend against these static files without running any Python process.

In `web/app.js`:
```javascript
// Toggle to true for instant offline development without a backend:
const USE_FIXTURES = true;

const _fetch = window.fetch;
window.fetch = (url, opts) => {
    if (!USE_FIXTURES) return _fetch(url, opts);
    const endpoint = String(url).split('?')[0].replace(/^\//, '') || 'config';
    return _fetch(`/fixtures/${endpoint}.json`);
};
```
Now serve the `web/` directory using any local web server (e.g. VSCode Live Server, `npx serve web`, or `python3 -m http.server --directory web 3000`).

### Mode B: Live Local API Mode
If you prefer running against the live FastAPI server:
```bash
# In repo root:
source .venv/bin/activate
PYTHONPATH=. python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```
- Interactive Swagger / OpenAPI documentation: **`http://localhost:8000/docs`**
- Frontend served at: **`http://localhost:8000/`**
- Static web assets at: **`http://localhost:8000/static/`**

---

## 2. System Division of Responsibilities

```
┌──────────────────────────────────────────────┐
│             FRONTEND (Your Scope)             │
│  - Leaflet / MapLibre Polar Stereographic Map │
│  - Cost-weight sliders (Time, Fuel, Risk)     │
│  - Lead-day forecast animation (1 to 14 days) │
│  - Route comparison table & profile selector  │
│  - Iceberg drift & ensemble ellipse rendering │
│  - Ground truth vs forecast overlay diff      │
└──────────────────────┬───────────────────────┘
                       │ HTTP REST (JSON)
┌──────────────────────┴───────────────────────┐
│            BACKEND (Backend Scope)            │
│  - 8-year Zarr Data Cube (SIC, ERA5, CMEMS)   │
│  - PyTorch U-Net 14-day Sea-Ice Forecaster    │
│  - 4 Baseline models (Persistence, etc.)     │
│  - RK4 Iceberg Momentum Solver & 50 Ensemble  │
│  - Spacetime 3D A* Route Planner              │
│  - IMO POLARIS Vessel Risk Index & Fuel Model │
└──────────────────────────────────────────────┘
```

---

## 3. Complete API Endpoint Contracts

All float values in fixtures are rounded to 3 decimal places for optimal network bandwidth and memory footprint.

### Summary Table

| Method | Endpoint | Description | Fixture File |
|---|---|---|---|
| `GET` | `/config` | Stations, origins, vessel parameters, default weights | `web/fixtures/config.json` |
| `GET` | `/demo-dates` | Available dates and held-out validation dates | `web/fixtures/demo-dates.json` |
| `GET` | `/grid` | Coordinate grid (`lat`, `lon`, `land_mask`) — **fetch once!** | `web/fixtures/grid.json` |
| `GET` | `/forecast` | Sea-ice concentration field for init date and lead day | `web/fixtures/forecast.json` |
| `GET` | `/observed` | Actual observed sea-ice concentration for ground truth | `web/fixtures/observed.json` |
| `GET` | `/bergs` | Iceberg tracks + 50-member Monte Carlo drift ensemble | `web/fixtures/bergs.json` |
| `POST` | `/route` | Multi-objective optimal routes and alternative profiles | `web/fixtures/route.json` |
| `GET` | `/metrics` | Baseline forecast comparison metrics and skill tables | `web/fixtures/metrics.json` |

---

### Detailed Endpoint Specifications

#### 1. `GET /config`
Returns system constants, geographic boundaries, target stations, and default routing parameters.
- **Query Params**: None
- **Key Fields**:
  - `stations`: Object with key-value pairs (`bharati`, `maitri`), including `name`, `lat`, `lon`.
  - `origins`: Object with departure ports (`cape_town`, `fremantle`).
  - `ship`: Default vessel metrics (`v_open_kn`, `draft_m`, `length_m`).
  - `routing_weights`: Default values for `w_time`, `w_fuel`, `w_risk`.

#### 2. `GET /grid`
Provides the static $112 \times 560$ grid coordinates.
- **Rule for Frontend**: **Fetch this once** when the application loads and store it in memory. Do not re-fetch when scrubbing the forecast lead day slider.
- **Key Fields**:
  - `shape`: `[112, 560]`
  - `lat`: 2D array of latitudes ($[-78.0, -50.0]$)
  - `lon`: 2D array of longitudes ($[-20.0, 120.0]$)
  - `land_mask`: 2D array (`1` = land/ice-shelf, `0` = ocean)
  - `cell_size_km`: `25.0`

#### 3. `GET /forecast?date={YYYY-MM-DD}&lead={1..14}`
Returns predicted Sea-Ice Concentration (SIC) field.
- **Parameters**:
  - `date`: Initialization date (e.g. `"2023-01-13"`).
  - `lead`: Forecast horizon in days (`1` to `14`, default `7`).
- **Critical Frontend Logic**:
  - Check `response.source`:
    - `"model"`: Generated by the trained U-Net forecaster.
    - `"observed_fallback"`: Model weights were not cached for this date; returns real observed data. Display a warning badge in the UI.
  - The forecast is initialized on `date` and valid at `stats.valid_date` (`date + lead`).
  - To compute or display forecast error in the UI:
    ```javascript
    const forecast = await fetch(`/forecast?date=${initDate}&lead=${lead}`).then(r => r.json());
    const observed = await fetch(`/observed?date=${forecast.stats.valid_date}`).then(r => r.json());
    // Difference: forecast.sic[y][x] - observed.sic[y][x]
    ```

#### 4. `GET /observed?date={YYYY-MM-DD}`
Returns ground-truth satellite sea-ice concentration for the requested date.
- **Parameters**:
  - `date`: ISO date string (e.g. `"2023-01-20"`).
- **Key Fields**:
  - `sic`: 2D array ($112 \times 560$) with values $[0.0, 1.0]$.
  - `stats.mean_sic`: Mean concentration across open ocean cells.
  - `stats.ice_extent_km2`: Total area where $\text{SIC} > 0.15$.

#### 5. `GET /bergs?date={YYYY-MM-DD}&horizon={days}&limit={count}`
Returns iceberg drift tracks and Monte Carlo ensemble spreads.
- **Parameters**:
  - `date`: Date to start drift from (default `"2023-01-13"`).
  - `horizon`: Days ahead to propagate (default `7`).
  - `limit`: Number of largest bergs to return (default `8`).
- **Key Fields**:
  - `bergs`: List of iceberg objects:
    - `berg_id`: String identifier (e.g. `"B15A"`).
    - `length_m`, `width_m`: Dimensions in meters.
    - `mean_track`: Array of daily positions `[{day, lat, lon}, ...]`.
    - `ensemble`: Array of 50 member trajectories for rendering drift uncertainty ellipses or particles.

#### 6. `POST /route`
Computes the optimal path and comparison profiles.
- **Request Body**:
  ```json
  {
    "origin": "cape_town",
    "destination": "bharati",
    "depart_date": "2023-01-13",
    "w_time": 1.0,
    "w_fuel": 0.5,
    "w_risk": 2.0,
    "berg_limit": 8
  }
  ```
- **Response Key Fields**:
  - `routes`: Object containing route profiles:
    - `min_time`: Fastest route minimizing transit duration.
    - `min_fuel`: Route optimizing fuel consumption and low engine strain.
    - `min_risk`: Route actively avoiding heavy pack ice and iceberg risk fields.
    - `balanced`: Balanced multi-objective route.
    - `direct`: Unconstrained direct baseline (used to show how dangerous a naive straight line is).
  - Route Profile Attributes:
    - `success`: Boolean.
    - `path_latlon`: Array of coordinates `[[lat, lon], ...]`.
    - `distance_nm`: Total distance in nautical miles.
    - `time_h`: Total transit time in hours.
    - `fuel_t`: Estimated fuel consumption in metric tonnes.
    - `ice_hours_03`: Hours navigating ice $\text{SIC} \ge 0.3$.
    - `ice_hours_07`: Hours navigating heavy pack $\text{SIC} \ge 0.7$.
    - `max_berg_risk`: Maximum iceberg encounter probability encountered along the track.
  - `comparison`: Pre-formatted markdown/text summary table.

#### 7. `GET /metrics`
Returns validation scores comparing the U-Net against 4 baselines.
- **Key Fields**:
  - `baselines`: Array of benchmark rows containing `model`, `lead_day`, `rmse`, `mae`, `iiee`, `ice_edge_error`.

---

## 4. How to Regenerate Fixtures

Whenever the backend team updates a schema, profile, or default parameter, they run:
```bash
PYTHONPATH=. python scripts/dump_fixtures.py
```
This updates all `.json` files in `web/fixtures/` directly. You can simply pull the latest git commits to receive refreshed mock data.

---

## 5. Contact & Support for Frontend Developers

If you need a new field added to `/route`, an additional demo date, or a custom route profile:
- Check `config/routing.yaml` for default weights and profiles.
- Check `config/domain.yaml` for station coordinates and vessel speeds.
- All backend calculations are fully decoupled from frontend logic.
