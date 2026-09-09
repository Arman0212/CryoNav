/* useProvenance — dataset provenance and coverage reporting. */

import { useQuery } from '@tanstack/react-query';
import provenanceService from '@services/provenanceService';

export function useProvenance() {
  return useQuery({
    queryKey: ['data-provenance'],
    queryFn: provenanceService.getProvenance,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLiveBergs() {
  return useQuery({
    queryKey: ['bergs-live'],
    queryFn: provenanceService.getLiveBergs,
    staleTime: 60 * 60 * 1000,   // weekly feed — no point polling it
  });
}

export default useProvenance;
