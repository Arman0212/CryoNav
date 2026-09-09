/* ═══════════════════════════════════════════════════════════════
   Grid Service — GET /grid

   New endpoint on the backend. The grid geometry (lat, lon, land mask,
   bathymetry) used to be repeated inside every /forecast response; it is
   now served once here, because the lead-day animation calls /forecast up
   to fourteen times and the payload was dominated by coordinates that
   never change.

   FETCH THIS ONCE and keep it in memory — useGrid() sets an effectively
   infinite staleTime for exactly this reason.
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const gridService = {
  /**
   * Static grid geometry for the whole domain.
   * @returns {Promise<{
   *   shape: number[],            // [rows, cols] — depends on the loaded cube
   *   lat: number[][],            // 2D latitudes
   *   lon: number[][],            // 2D longitudes
   *   land_mask: number[][],      // 1 = land / ice shelf, 0 = ocean
   *   bathy: number[][]|null,     // real GEBCO / IBCSO v2 depths
   *   cell_size_km: number,
   *   bathymetry_source: string,
   * }>}
   */
  async getGrid() {
    const { data } = await apiClient.get('/grid');
    return data;
  },
};

export default gridService;
