/* Simulation Service — /simulation (NOT in the real backend yet)
   Arman0212/CryoNav has no /simulation route or digital-twin/timeline
   concept server-side. Calls below will 404 until a backend route is
   added. */
import apiClient from './api';
const simulationService = {
  async createSimulation(config) {
    const { data } = await apiClient.post('/simulation', config);
    return data;
  },
  async getSimulationState(id, time) {
    const { data } = await apiClient.get(`/simulation/${id}/state`, { params: { time } });
    return data;
  },
  async getSimulationEvents(id) {
    const { data } = await apiClient.get(`/simulation/${id}/events`);
    return data;
  },
};
export default simulationService;
