/* ═══════════════════════════════════════════════════════════════
   Risk Service — /risk (NOT in the real backend yet)
   Arman0212/CryoNav has no /risk route. POLARIS RIV bands live in
   config/routing.yaml and berg_risk_field.py computes a risk grid
   internally, but neither is exposed via the API today — POST /route
   even passes berg_risk as a zero array. Calls below will 404 until a
   backend route is added.
   ═══════════════════════════════════════════════════════════════ */
import apiClient from './api';

const riskService = {
  async getRisk(position, date) {
    const { data } = await apiClient.get('/risk', { params: { lat: position.lat, lon: position.lon, date } });
    return data;
  },
  async getRiskField(bounds, date) {
    const { data } = await apiClient.get('/risk/field', { params: { ...bounds, date } });
    return data;
  },
  async getAnri(routeId) {
    const { data } = await apiClient.get(`/risk/anri/${routeId}`);
    return data;
  },
};
export default riskService;
