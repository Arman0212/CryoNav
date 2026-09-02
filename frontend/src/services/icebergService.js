/* ═══════════════════════════════════════════════════════════════
   Iceberg Service — GET /bergs
   Aligned to Arman0212/CryoNav src/api/main.py

   The backend has exactly one iceberg route: GET /bergs?date=...&horizon=...
   It returns { bergs: [{ berg_id, mean_track, ensemble, length_m, width_m }],
   date, horizon } for a fixed synthetic set of 5 bergs (there is no
   per-berg detail or trajectory endpoint, and no server-side bbox filter).
   getIceberg() and getTrajectory() below are implemented client-side on
   top of /bergs rather than hitting endpoints that don't exist.
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const icebergService = {
  /**
   * Get all tracked icebergs for a given date.
   *
   * @param {string} [date='2023-01-20'] - ISO date string (backend default)
   * @param {number} [horizon=7] - Forecast/track horizon in days (max 14 server-side)
   * @returns {Promise<Array>} Array of { berg_id, mean_track, ensemble, length_m, width_m }
   */
  async getIcebergs(date = '2023-01-20', horizon = 7) {
    const { data } = await apiClient.get('/bergs', {
      params: { date, horizon },
    });
    return data.bergs;
  },

  /**
   * Get a single iceberg's data.
   * NOTE: there's no GET /bergs/{id} route — this fetches the full /bergs
   * response for the date and picks out the matching berg_id client-side.
   *
   * @param {string} id - berg_id (e.g. "berg_0")
   * @param {string} [date='2023-01-20']
   * @param {number} [horizon=7]
   * @returns {Promise<Object|undefined>}
   */
  async getIceberg(id, date = '2023-01-20', horizon = 7) {
    const bergs = await this.getIcebergs(date, horizon);
    return bergs.find((b) => b.berg_id === id);
  },

  /**
   * Get the predicted trajectory (RK4 ensemble) for an iceberg.
   * NOTE: there's no GET /bergs/{id}/trajectory route — the RK4 ensemble
   * track is already included in each berg's /bergs response as
   * `mean_track` / `ensemble`, so this just extracts it.
   *
   * @param {string} id - berg_id
   * @param {string} [date='2023-01-20']
   * @param {number} [horizon=7] - Days of drift to request (server caps at 14)
   * @returns {Promise<{mean_track: object, ensemble: number[][]}|undefined>}
   */
  async getTrajectory(id, date = '2023-01-20', horizon = 7) {
    const berg = await this.getIceberg(id, date, horizon);
    if (!berg) return undefined;
    return { mean_track: berg.mean_track, ensemble: berg.ensemble };
  },
};

export default icebergService;
