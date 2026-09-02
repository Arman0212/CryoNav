/* ═══════════════════════════════════════════════════════════════
   Metrics Service — GET /metrics
   Aligned to Arman0212/CryoNav src/api/main.py

   GET /metrics returns whatever exists on disk under results/:
     { baselines?: object[], training_history?: object, skill_plot_available: boolean }
   There is no `model` query param (the backend ignores unknown params)
   and no `data_freshness` field.
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const metricsService = {
  async getSystemMetrics() {
    const { data } = await apiClient.get('/metrics');
    return data;
  },

  /**
   * NOTE: the backend has a single /metrics route with no model filter —
   * this returns the same payload as getSystemMetrics() regardless of
   * `model` until the backend supports per-model metrics.
   */
  async getModelMetrics(_model = 'unet') {
    const { data } = await apiClient.get('/metrics');
    return data;
  },

  /**
   * Derives a simple freshness/availability summary from the real
   * /metrics fields, since there is no `data_freshness` field.
   */
  async getDataFreshness() {
    const { data } = await apiClient.get('/metrics');
    return {
      hasBaselines: Boolean(data.baselines),
      hasTrainingHistory: Boolean(data.training_history),
      skillPlotAvailable: Boolean(data.skill_plot_available),
    };
  },
};

export default metricsService;
