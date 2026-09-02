/* ═══════════════════════════════════════════════════════════════
   Config Service — GET /config, GET /demo-dates
   Aligned to Arman0212/CryoNav src/api/main.py

   GET /config returns:
     { region, stations, origins, held_out_demo_dates,
       forecast_horizon_days, ship, routing_weights, alternative_profiles }
   There is no grid_resolution / bounds / vessel_defaults field — those
   names were guesses that don't match the real response.
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const configService = {
  async getConfig() {
    const { data } = await apiClient.get('/config');
    return data;
  },

  /**
   * Extract the domain's spatial bounds from /config.
   * NOTE: grid resolution (25km) and grid shape (264x220) are defined in
   * config/domain.yaml but are NOT included in the /config API response —
   * they're returned here as static fallbacks documented in that file,
   * not live data.
   */
  async getGridInfo() {
    const { data } = await apiClient.get('/config');
    return {
      bounds: data.region, // { name, lon_min, lon_max, lat_min, lat_max }
      gridResolutionKm: 25, // static — not exposed by /config
      gridShape: [264, 220], // static — not exposed by /config
    };
  },

  /**
   * Ship/vessel defaults. The backend calls this field `ship`, not
   * `vessel_defaults`.
   */
  async getVesselDefaults() {
    const { data } = await apiClient.get('/config');
    return data.ship || {};
  },

  /**
   * Available demo dates (GET /demo-dates) — held-out dates the model was
   * never trained on, plus the full date range of the Zarr cube.
   * @returns {Promise<{all_dates?: string[], demo_dates: string[], range?: {start: string, end: string}}>}
   */
  async getDemoDates() {
    const { data } = await apiClient.get('/demo-dates');
    return data;
  },
};

export default configService;
