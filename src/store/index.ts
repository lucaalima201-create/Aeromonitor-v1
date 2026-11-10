// ============================================================
// AeroMonitor AI — Store Global (Zustand)
// ============================================================

import { create } from 'zustand';
import {
  clientsDB,
  requestsDB,
  quotesDB,
  monitoringDB,
  alertsDB,
} from '../db';
import type {
  Client,
  FlightRequest,
  QuoteEntry,
  MonitoringEntry,
  AlertEntry,
  DashboardStats,
} from '../types';

interface AppState {
  // ── Data ──────────────────────────────────────────────────
  clients: Client[];
  requests: FlightRequest[];
  quotes: QuoteEntry[];
  monitoring: MonitoringEntry[];
  alerts: AlertEntry[];
  stats: DashboardStats | null;

  // ── UI State ──────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────
  loadAll: () => Promise<void>;
  loadClients: () => Promise<void>;
  loadRequests: () => Promise<void>;
  loadQuotes: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  computeStats: () => Promise<void>;
  setError: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  clients: [],
  requests: [],
  quotes: [],
  monitoring: [],
  alerts: [],
  stats: null,
  isLoading: false,
  error: null,

  setError: (msg) => set({ error: msg }),

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [clients, requests, quotes, monitoring, alerts] = await Promise.all([
        clientsDB.getAll(),
        requestsDB.getAll(),
        quotesDB.getRecent(50),
        monitoringDB.getAll(),
        alertsDB.getAll(),
      ]);
      set({ clients, requests, quotes, monitoring, alerts, isLoading: false });
      get().computeStats();
    } catch (e) {
      set({ error: 'Erro ao carregar dados.', isLoading: false });
    }
  },

  loadClients: async () => {
    const clients = await clientsDB.getAll();
    set({ clients });
    get().computeStats();
  },

  loadRequests: async () => {
    const requests = await requestsDB.getAll();
    set({ requests });
    get().computeStats();
  },

  loadQuotes: async () => {
    const quotes = await quotesDB.getRecent(50);
    set({ quotes });
  },

  loadAlerts: async () => {
    const alerts = await alertsDB.getAll();
    set({ alerts });
    get().computeStats();
  },

  computeStats: async () => {
    const { clients, requests, monitoring, alerts } = get();
    const openStatuses = ['new', 'awaiting_quote', 'monitoring', 'proposal_sent', 'negotiation'];
    const openRequests = requests.filter((r) => openStatuses.includes(r.status)).length;
    const proposalsSent = requests.filter((r) => r.status === 'proposal_sent').length;
    const salesCompleted = requests.filter((r) => r.status === 'sale_completed').length;
    const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isDismissed).length;
    const recentQuotes = await quotesDB.getRecent(5);
    const pendingClients = requests.filter(
      (r) => r.status === 'proposal_sent' || r.status === 'negotiation'
    );

    set({
      stats: {
        totalClients: clients.length,
        openRequests,
        monitoredRoutes: monitoring.filter((m) => m.isActive).length,
        proposalsSent,
        salesCompleted,
        unreadAlerts,
        recentQuotes,
        pendingClients,
      },
    });
  },
}));
