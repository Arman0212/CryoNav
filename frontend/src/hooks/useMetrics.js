/* useMetrics — React Query wrapper around GET /metrics */
import { useQuery } from '@tanstack/react-query';
import metricsService from '@services/metricsService';

/** Validation metrics: baselines table, training history, skill plot availability */
export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: metricsService.getSystemMetrics,
    staleTime: 5 * 60 * 1000,
  });
}
