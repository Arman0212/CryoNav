/* ═══════════════════════════════════════════════════════════════
   useAppStore — Global application state
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useAppStore = create((set) => ({
  /* ── Selected Date ── */
  // Replaces the hardcoded '2023-01-20' in the current frontend.
  // All data fetching and map rendering should reference this date.
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),

  /* ── View Mode ── */
  viewMode: 'live',  // 'live' | 'historical' | 'simulation'
  setViewMode: (mode) => set({ viewMode: mode }),

  /* ── Sidebar ── */
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  /* ── Active Page ── */
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  /* ── Connection Status ── */
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  /* ── Global Loading ── */
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));

export default useAppStore;
