/* ═══════════════════════════════════════════════════════════════
   Weather Service — /weather (NOT in the real backend yet)
   Arman0212/CryoNav's src/api/main.py has no /weather route at all
   (ERA5 atmospheric data is referenced in config but never served via
   API). Calls below will 404 until a backend route is added.
   ═══════════════════════════════════════════════════════════════ */
import apiClient from './api';

const weatherService = {
  async getWeather(position, date) {
    const { data } = await apiClient.get('/weather', { params: { lat: position.lat, lon: position.lon, date } });
    return data;
  },
  async getWeatherForecast(position, hours = 48) {
    const { data } = await apiClient.get('/weather/forecast', { params: { lat: position.lat, lon: position.lon, hours } });
    return data;
  },
};
export default weatherService;
