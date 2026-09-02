/* ═══════════════════════════════════════════════════════════════
   useSimulationStore — Digital twin / simulation timeline state
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useSimulationStore = create((set) => ({
  /* ── State Machine ── */
  // Idle → Configuring → Loading → Playing → Paused → Completed
  status: 'idle',  // 'idle' | 'configuring' | 'loading' | 'playing' | 'paused' | 'completed'
  setStatus: (status) => set({ status }),

  /* ── Timeline ── */
  currentTime: null,       // ISO string — current simulation time
  startTime: null,         // ISO string — T-48H
  endTime: null,           // ISO string — T+48H
  setTimeline: (start, end) => set({ startTime: start, endTime: end, currentTime: start }),
  setCurrentTime: (time) => set({ currentTime: time }),

  /* ── Playback ── */
  playbackSpeed: 1,        // 1x, 2x, 5x, 10x
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  /* ── Simulation ID ── */
  simulationId: null,
  setSimulationId: (id) => set({ simulationId: id }),

  /* ── Events ── */
  events: [],              // [{ time, type, description, severity }]
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),
  setEvents: (events) => set({ events }),

  /* ── Actions ── */
  play: () => set({ status: 'playing' }),
  pause: () => set({ status: 'paused' }),
  reset: () =>
    set({
      status: 'idle',
      currentTime: null,
      startTime: null,
      endTime: null,
      simulationId: null,
      events: [],
      playbackSpeed: 1,
    }),
}));

export default useSimulationStore;
