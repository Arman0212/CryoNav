/* useObserved — React Query wrapper around GET /observed */
import { useQuery } from '@tanstack/react-query';
import observedService from '@services/observedService';

/**
 * Observed SIC field for a date, from the NSIDC-backed Zarr cube.
 * @param {string} date - ISO date string (YYYY-MM-DD)
 */
export function useObserved(date) {
  return useQuery({
    queryKey: ['observed', date],
    queryFn: () => observedService.getObserved(date),
    enabled: Boolean(date),
  });
}
