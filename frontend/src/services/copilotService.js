/* Copilot Service — /copilot (NOT in the real backend yet)
   Arman0212/CryoNav has no /copilot route or LLM integration server-side.
   Calls below will 404 until a backend route is added. */
import apiClient from './api';
const copilotService = {
  /**
   * Ask the AI Copilot a question grounded in system state.
   * The copilot retrieves context from current environmental, route, and risk state.
   * It NEVER invents data — all claims must reference API endpoints.
   *
   * @param {string} question - Natural language question
   * @param {Object} [context] - Optional additional context (selected route, position, etc.)
   * @returns {Promise<Object>} { answer, sources: [], suggestions: [] }
   */
  async ask(question, context = {}) {
    const { data } = await apiClient.post('/copilot', { question, context });
    return data;
  },
};
export default copilotService;
