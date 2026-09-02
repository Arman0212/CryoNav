/* ═══════════════════════════════════════════════════════════════
   Observed Service — GET /observed
   Aligned to Arman0212/CryoNav src/api/main.py
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const observedService = {
  /**
   * Get observed SIC data for a specific date, pulled from the Antarctic
   * Zarr data cube.
   *
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @returns {Promise<{sic: number[][], shape: number[], date: string, stats: object}>}
   */
  async getObserved(date) {
    const { data } = await apiClient.get('/observed', {
      params: { date },
    });
    return data;
  },
};

export default observedService;
