# API fixtures

One real response per endpoint, frozen to disk. Build the UI against these —
no 5.4 GB Zarr cube, no trained model, no backend process required.

Regenerate after any change to a response shape:

```bash
PYTHONPATH=. python scripts/dump_fixtures.py
```

| File | Endpoint | Notes |
|---|---|---|
| `config.json` | `GET /config` | stations, origins, ship, default cost weights |
| `demo-dates.json` | `GET /demo-dates` | all 2,922 dates + the 3 held-out demo dates |
| `grid.json` | `GET /grid` | `lat`, `lon`, `land_mask` — **fetch once**, reuse for every field |
| `forecast.json` | `GET /forecast?date=2023-01-13&lead=7` | `sic` only; pair with `grid.json` to draw |
| `observed.json` | `GET /observed?date=2023-01-20` | `sic` only |
| `bergs.json` | `GET /bergs?date=2023-01-13&horizon=7&limit=8` | observed bergs, 50-member ensemble |
| `route.json` | `POST /route` | 5 route profiles, comparison table, rejection reasons |
| `metrics.json` | `GET /metrics` | baseline table + training history |

Floats are rounded to 3 decimals (SIC is `[0,1]`; lat/lon at 3 dp is ~100 m).

## Two contract rules that are easy to get wrong

**1. Dates.** `/forecast?date=D&lead=L` is *initialized* on `D` and *valid* at
`D + L`. To draw forecast error, fetch the observation for the **valid** date,
which the response gives you:

```js
const f = await (await fetch('/forecast?date=2023-01-13&lead=7')).json();
const o = await (await fetch(`/observed?date=${f.stats.valid_date}`)).json();
// f.sic - o.sic  ->  real forecast error
```

Pairing `/observed?date=D` with the forecast instead shows the ice *change*
over the lead window, not the model's error.

**2. Check `source`.** `/forecast` returns `source: "model"` when a cached
U-Net forecast exists for that init date. Otherwise it returns
`source: "observed_fallback"` plus a `warning`, and the field is the *observed
truth*, not a prediction. Never plot a fallback as a forecast — badge it, or
refuse to draw it. `/route` reports the same via `forecast_source`, and berg
provenance via `berg_source` (`observed` | `synthetic` | `unavailable`).

Cached init dates ship for the three demo dates. Add more with:

```bash
PYTHONPATH=. python src/ice/predict.py --dates 2023-06-01 2023-06-08
```

## Developing against the fixtures

Paste this above the `fetch` calls in `app.js` to serve every request from
fixtures, ignoring query params:

```js
const USE_FIXTURES = true;
const _fetch = window.fetch;
window.fetch = (url, opts) => {
    if (!USE_FIXTURES) return _fetch(url, opts);
    const name = String(url).split('?')[0].replace(/^\//, '') || 'config';
    return _fetch(`/static/fixtures/${name}.json`);
};
```

Set `USE_FIXTURES = false` to go back to the live API. Delete the shim before
merging — it is a dev aid, not a feature.
