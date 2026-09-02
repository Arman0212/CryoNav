/* useIcebergs — React Query wrapper around GET /bergs */
import { useQuery } from '@tanstack/react-query';
import icebergService from '@services/icebergService';

/**
 * Tracked icebergs (synthetic demo set of 5) with RK4 ensemble drift tracks.
 * @param {string} [date='2023-01-20']
 * @param {number} [horizon=7] - Drift horizon in days (server caps at 14)
 */
export function useIcebergs(date = '2023-01-20', horizon = 7) {
  return useQuery({
    queryKey: ['bergs', date, horizon],
    queryFn: () => icebergService.getIcebergs(date, horizon),
    enabled: Boolean(date),
  });
}
