/* useOcean / useWeather — real CMEMS and ERA5 fields for a date.

   Both responses are a few MB, so they're cached for the session and only
   fetched when something actually asks for them (pass a falsy date to
   keep the query idle). */

import { useQuery } from '@tanstack/react-query';
import oceanService from '@services/oceanService';
import weatherService from '@services/weatherService';

export function useOcean(date, stride = 6) {
  return useQuery({
    queryKey: ['ocean', date, stride],
    queryFn: () => oceanService.getOcean(date, stride),
    enabled: Boolean(date),
    staleTime: 10 * 60 * 1000,
  });
}

export function useWeather(date, stride = 6) {
  return useQuery({
    queryKey: ['weather', date, stride],
    queryFn: () => weatherService.getWeather(date, stride),
    enabled: Boolean(date),
    staleTime: 10 * 60 * 1000,
  });
}

export default useOcean;
