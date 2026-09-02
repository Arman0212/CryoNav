/* Ocean Service — /ocean (NOT in the real backend yet)
   Arman0212/CryoNav has no /ocean route (CMEMS current/SSH data is not
   served via API — see the Dashboard's "Ocean (CMEMS) — Not Connected"
   status row). Calls below will 404 until a backend route is added. */
import apiClient from './api';
const oceanService = {
  async getOceanState(bounds, date) {
    const { data } = await apiClient.get('/ocean', { params: { ...bounds, date } });
    return data;
  },
  async getCurrents(bounds, date) {
    const { data } = await apiClient.get('/ocean/currents', { params: { ...bounds, date } });
    return data;
  },
};
export default oceanService;
