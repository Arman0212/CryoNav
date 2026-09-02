/* ═══════════════════════════════════════════════════════════════
   useEnvironmentStore — Current environmental state snapshot
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useEnvironmentStore = create((set) => ({
  /* ── Sea Ice ── */
  sicObserved: null,    // { grid, date, isReal, coverage }
  sicForecast: null,    // { grid, date, lead, model, confidence }
  setSicObserved: (data) => set({ sicObserved: data }),
  setSicForecast: (data) => set({ sicForecast: data }),

  /* ── Icebergs ── */
  icebergs: [],         // [{ id, lat, lon, size, type, lastSeen, risk }]
  setIcebergs: (icebergs) => set({ icebergs }),
  updateIceberg: (id, data) =>
    set((state) => ({
      icebergs: state.icebergs.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    })),

  /* ── Weather ── */
  weather: null,        // { wind, temperature, visibility, pressure, storms }
  setWeather: (weather) => set({ weather }),

  /* ── Ocean ── */
  ocean: null,          // { currents, sst, waves, ssh }
  setOcean: (ocean) => set({ ocean }),

  /* ── Vessels ── */
  vessels: [],          // [{ id, name, lat, lon, heading, speed, type }]
  setVessels: (vessels) => set({ vessels }),
  updateVessel: (id, data) =>
    set((state) => ({
      vessels: state.vessels.map((v) =>
        v.id === id ? { ...v, ...data } : v
      ),
    })),
}));

export default useEnvironmentStore;
