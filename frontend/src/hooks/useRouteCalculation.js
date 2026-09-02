/* useRouteCalculation — React Query mutation wrapper around POST /route */
import { useMutation } from '@tanstack/react-query';
import routeService from '@services/routeService';

/**
 * Computes routes for an origin/destination/date/weights combo.
 * Returns { routes, comparison, origin, destination, depart_date } on success,
 * where `routes` is keyed by profile id (great_circle, min_ice, min_time,
 * balanced, persistence_route).
 */
export function useRouteCalculation() {
  return useMutation({
    mutationFn: (params) => routeService.calculateRoute(params),
  });
}
