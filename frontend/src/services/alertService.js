/* Alert Service — /alerts (NOT in the real backend yet)
   Arman0212/CryoNav has no /alerts route or persisted alert feed —
   alerts would need to be derived client-side from /forecast, /bergs,
   and /route responses. Calls below will 404 until a backend route is
   added. */
import apiClient from './api';
const alertService = {
  async getAlerts(filters = {}) {
    const { data } = await apiClient.get('/alerts', { params: filters });
    return data;
  },
  async acknowledgeAlert(id) {
    const { data } = await apiClient.post(`/alerts/${id}/ack`);
    return data;
  },
};
export default alertService;
