/* ═══════════════════════════════════════════════════════════════
   Forecast Service — GET /forecast
   Aligned to Arman0212/CryoNav src/api/main.py
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const forecastService = {
  /**
   * Get the SIC forecast for an initialisation date and lead day.
   *
   * The response no longer carries `lat`/`lon`/`land_mask` — the backend
   * moved that geometry to GET /grid so the lead-day animation isn't
   * re-downloading coordinates fourteen times. Pair this with useGrid().
   *
   * IMPORTANT — check `source` before presenting the field as a forecast:
   *   "model"             → produced by the trained U-Net
   *   "observed_fallback" → no cached weights for this date, so real
   *                         observed data is returned instead. The UI must
   *                         say so rather than passing it off as a forecast.
   *
   * The field is initialised on `date` and valid at `stats.valid_date`
   * (= date + lead), which is the date to request from /observed when
   * computing forecast error.
   *
   * @param {string} date - Initialisation date (YYYY-MM-DD)
   * @param {number} [lead=7] - Lead in days, 1..14
   * When `source` is "observed_fallback" the response also carries a
   * human-readable `warning` explaining why.
   *
   * @returns {Promise<{sic: number[][], shape: number[], source: 'model'|'observed_fallback', warning?: string, stats: {init_date: string, valid_date: string, lead_day: number, mean_sic: number}}>}
   */
  async getForecast(date, lead = 7) {
    const { data } = await apiClient.get('/forecast', {
      params: { date, lead },
    });
    return data;
  },

  /**
   * Get forecast skill metrics for a given model.
   * NOTE: there is no /forecast/skill route on the real backend — model
   * skill data (RMSE/MAE/IIEE) lives under GET /metrics instead
   * (training_history, baselines). Kept as a stub; calling this will 404
   * until/unless the backend adds a dedicated route.
   */
  async getForecastSkill(modelVersion = 'unet-v1') {
    const { data } = await apiClient.get('/forecast/skill', {
      params: { model: modelVersion },
    });
    return data;
  },
};

export default forecastService;
