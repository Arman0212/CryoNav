/* useIcebergs — iceberg drift tracks from GET /bergs. */
import { useQuery } from '@tanstack/react-query';
import icebergService from '@services/icebergService';

/**
 * Tracked icebergs with their drift ensembles.
 * Returns the bergs array only — use useIcebergsMeta when you also need
 * to know where they came from.
 *
 * @param {string} [date='2023-01-13']
 * @param {number} [horizon=7] - Drift horizon in days
 * @param {number} [limit=8] - Number of largest bergs
 */
export function useIcebergs(date = '2023-01-13', horizon = 7, limit = 8) {
  return useQuery({
    queryKey: ['bergs', date, horizon, limit],
    queryFn: () => icebergService.getIcebergs(date, horizon, limit),
    enabled: Boolean(date),
  });
}

/**
 * Same request, keeping the envelope: `source` says whether these are
 * observed BYU tracks or synthetic fallback positions, and `n_ensemble`
 * how many drift members were propagated. The UI should report what the
 * backend actually says rather than assuming.
 */
export function useIcebergsMeta(date = '2023-01-13', horizon = 7, limit = 8) {
  return useQuery({
    queryKey: ['bergs-meta', date, horizon, limit],
    queryFn: () => icebergService.getIcebergsWithMeta(date, horizon, limit),
    enabled: Boolean(date),
  });
}

export default useIcebergs;
