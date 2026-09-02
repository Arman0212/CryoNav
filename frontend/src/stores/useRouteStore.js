/* ═══════════════════════════════════════════════════════════════
   useRouteStore — Route planning, comparison, and active routes
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useRouteStore = create((set) => ({
  /* ── Route Planning ── */
  origin: null,       // { id, name, lat, lon } or null
  destination: null,  // { id, name, lat, lon } or null
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),

  /* ── Cost Weights ──
     Matches the real POST /route body exactly: { w_time, w_fuel, w_risk }.
     Defaults come from config/routing.yaml cost_weights (balanced profile). */
  costWeights: {
    wTime: 1.0,
    wFuel: 0.5,
    wRisk: 2.0,
  },
  setCostWeight: (key, value) =>
    set((state) => ({
      costWeights: { ...state.costWeights, [key]: value },
    })),

  /* ── Vessel Configuration ── */
  vesselConfig: {
    type: 'PC7',
    speed: 12,           // knots
    fuelCapacity: 500,   // metric tons
  },
  setVesselConfig: (config) =>
    set((state) => ({
      vesselConfig: { ...state.vesselConfig, ...config },
    })),

  /* ── Computed Routes ── */
  routes: null,           // Full POST /route response: { routes: {profileKey: {...}}, comparison, origin, destination, depart_date }
  selectedRouteId: null,  // A profile key, e.g. 'balanced' | 'min_ice' | 'min_time' | 'great_circle' | 'persistence_route'
  isCalculating: false,

  setRoutes: (routes) => set({ routes }),
  selectRoute: (id) => set({ selectedRouteId: id }),
  setCalculating: (calculating) => set({ isCalculating: calculating }),

  /* ── Active Mission Route ── */
  activeRoute: null,     // Currently executing route
  setActiveRoute: (route) => set({ activeRoute: route }),

  /* ── Clear All ── */
  clearPlanning: () =>
    set({
      origin: null,
      destination: null,
      routes: null,
      selectedRouteId: null,
      isCalculating: false,
    }),
}));

export default useRouteStore;
