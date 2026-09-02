/* useForecast — React Query wrapper around GET /forecast */
import { useQuery } from '@tanstack/react-query';
import forecastService from '@services/forecastService';

/**
 * SIC "forecast" for a date + lead time.
 * NOTE: the backend currently returns observed data as the forecast — no
 * trained model is wired in yet (see forecastService.getForecast).
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {number} [lead=7] - Lead days
 */
export function useForecast(date, lead = 7) {
  return useQuery({
    queryKey: ['forecast', date, lead],
    queryFn: () => forecastService.getForecast(date, lead),
    enabled: Boolean(date),
  });
}
