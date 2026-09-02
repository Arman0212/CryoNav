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
| `forecast.json` | `GET /forecast?date=2023-01-13&lead=7` | `sic`, `lat`, `lon`, `land_mask` as 264×220 arrays |
| `observed.json` | `GET /observed?date=2023-01-20` | `sic` only — pair with forecast for the difference layer |
| `bergs.json` | `GET /bergs?date=2023-01-20&horizon=7` | mean tracks + ensemble members |
| `route.json` | `POST /route` | 5 route profiles, comparison table, rejection reasons |
| `metrics.json` | `GET /metrics` | baseline table + training history |

Floats are rounded to 3 decimals (SIC is `[0,1]`; lat/lon at 3 dp is ~100 m).

## Developing against them

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

## Known contract issues (backend side, being fixed)

- `forecast.json` is **1.4 MB** because every call re-sends `lat`, `lon` and
  `land_mask`, which never change. The lead-day animation fires 14 of these.
  These three arrays are moving to `/config`.
- `/forecast` currently returns *observed* SIC at `date + lead`, not the model
  output, so the forecast−observed difference layer is near-zero. Being wired
  to the cached U-Net forecast that `/route` already uses.
- `/bergs` ignores the real cube and its `date` argument, and returns a
  10-member ensemble (not 50).
- `/route` passes a zeroed berg-risk field, so the risk weight does not yet
  reflect icebergs.
