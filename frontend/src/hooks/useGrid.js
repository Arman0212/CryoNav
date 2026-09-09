/* useGrid — the domain grid, fetched once and kept.

   The backend explicitly moved this out of /forecast so it wouldn't be
   re-sent on every lead-day step, so re-fetching it here would undo that
   optimisation. Infinite staleTime, no refetch on mount. */

import { useQuery } from '@tanstack/react-query';
import gridService from '@services/gridService';

export function useGrid() {
  return useQuery({
    queryKey: ['grid'],
    queryFn: gridService.getGrid,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export default useGrid;
