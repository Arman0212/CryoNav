/* useConfig — React Query wrapper around GET /config and GET /demo-dates */
import { useQuery } from '@tanstack/react-query';
import configService from '@services/configService';

/** Domain configuration: region, stations, origins, ship, routing weights, alt profiles */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: configService.getConfig,
    staleTime: 10 * 60 * 1000, // config rarely changes
  });
}

/** Available demo dates + full date range of the loaded Zarr cube */
export function useDemoDates() {
  return useQuery({
    queryKey: ['demo-dates'],
    queryFn: configService.getDemoDates,
    staleTime: 10 * 60 * 1000,
  });
}
