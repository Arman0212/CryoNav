/* ═══════════════════════════════════════════════════════════════
   useAlertStore — Alert feed state
   ═══════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

const useAlertStore = create((set, get) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) =>
    set((state) => ({
      alerts: [{ ...alert, read: false, timestamp: new Date().toISOString() }, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),

  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.read).length,
    }),

  markRead: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, read: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    })),

  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
}));

export default useAlertStore;
