/* ═══════════════════════════════════════════════════════════════
   Forecast Service — GET /forecast
   Aligned to Arman0212/CryoNav src/api/main.py
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const forecastService = {
  /**
   * Get SIC forecast for a given date and lead time.
   * NOTE: the backend currently returns OBSERVED data as the "forecast"
   * (the demo has no trained model wired in yet) — see main.py get_forecast().
   *
   * @param {string} date - ISO date string (YYYY-MM-DD), used as the base date
   * @param {number} [lead=7] - Forecast lead in days (backend default is 7)
   * @returns {Promise<{sic: number[][], shape: number[], lat: number[][], lon: number[][], land_mask: number[][], stats: object}>}
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
