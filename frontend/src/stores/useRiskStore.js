/* ═══════════════════════════════════════════════════════════════
   useRiskStore — ANRI risk state
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useRiskStore = create((set) => ({
  /* ── Current ANRI ── */
  anri: null,          // 0–100 or null if not computed
  previousAnri: null,

  /* ── Risk Breakdown ── */
  breakdown: {
    seaIce: 0,
    iceberg: 0,
    wind: 0,
    waves: 0,
    visibility: 0,
    ocean: 0,
  },

  /* ── Risk Timeline (forecast horizon) ── */
  riskTimeline: [],    // [{ time, anri, breakdown }]

  /* ── Risk Field (spatial) ── */
  riskField: null,     // Grid data for RiskZoneLayer

  /* ── Update Actions ── */
  setRisk: (anri, breakdown) =>
    set((state) => ({
      previousAnri: state.anri,
      anri,
      breakdown: { ...state.breakdown, ...breakdown },
    })),

  setRiskTimeline: (timeline) => set({ riskTimeline: timeline }),
  setRiskField: (field) => set({ riskField: field }),

  /* ── Reset ── */
  clearRisk: () =>
    set({
      anri: null,
      previousAnri: null,
      breakdown: { seaIce: 0, iceberg: 0, wind: 0, waves: 0, visibility: 0, ocean: 0 },
      riskTimeline: [],
      riskField: null,
    }),
}));

export default useRiskStore;
