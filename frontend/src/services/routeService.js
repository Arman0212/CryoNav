/* ═══════════════════════════════════════════════════════════════
   Route Service — POST /route
   Aligned to Arman0212/CryoNav src/api/main.py

   The backend's RouteRequest body is FLAT:
     { origin, destination, depart_date, w_time, w_fuel, w_risk }
   (previously this service sent { origin, destination, weights, vessel,
   date } which does not match the pydantic model and would 422.)

   A single POST /route call already computes every alternative profile
   defined in config/routing.yaml (great_circle, min_ice, min_time,
   balanced, persistence_route) plus a comparison table — there is no
   separate "optimize" endpoint or per-route detail endpoint.
   ═══════════════════════════════════════════════════════════════ */

import apiClient from './api';

const routeService = {
  /**
   * Compute routes between an origin and destination.
   *
   * @param {Object} params
   * @param {string} [params.origin='cape_town'] - Origin id (must be a key in DOMAIN.origins or DOMAIN.stations)
   * @param {string} [params.destination='bharati'] - Destination id (must be a key in DOMAIN.stations or DOMAIN.origins)
   * @param {string} [params.departDate='2023-01-13'] - Departure date (YYYY-MM-DD)
   * @param {number} [params.wTime=1.0] - Time cost weight
   * @param {number} [params.wFuel=0.5] - Fuel cost weight
   * @param {number} [params.wRisk=2.0] - Risk cost weight
   * @returns {Promise<{routes: object, comparison: object, origin: object, destination: object, depart_date: string}>}
   */
  async calculateRoute({
    origin = 'cape_town',
    destination = 'bharati',
    departDate = '2023-01-13',
    wTime = 1.0,
    wFuel = 0.5,
    wRisk = 2.0,
  } = {}) {
    const { data } = await apiClient.post('/route', {
      origin,
      destination,
      depart_date: departDate,
      w_time: wTime,
      w_fuel: wFuel,
      w_risk: wRisk,
    });
    return data;
  },

  /**
   * Kept for backward compatibility with call sites expecting "optimize
   * across multiple objectives" — the real backend already returns every
   * alternative profile (great_circle, min_ice, min_time, balanced,
   * persistence_route) from a single POST /route call, so this is just
   * an alias for calculateRoute rather than a separate network call.
   */
  async optimizeRoutes(params) {
    return this.calculateRoute(params);
  },

  /**
   * Pick one alternative profile out of an already-fetched /route
   * response — there is no GET /routes/{id}/profile endpoint server-side,
   * the profiles are all returned together in `routes.routes`.
   *
   * @param {Object} routeResponse - The object returned by calculateRoute()
   * @param {string} profileKey - e.g. 'balanced', 'min_ice', 'min_time', 'great_circle', 'persistence_route'
   * @returns {Object|undefined}
   */
  getRouteProfile(routeResponse, profileKey) {
    return routeResponse?.routes?.[profileKey];
  },
};

export default routeService;
