// ============================================================
// AeroMonitor AI — Camada de Persistência (Dexie / IndexedDB)
// ============================================================

import Dexie, { type Table } from 'dexie';
import type {
  Client,
  FlightRequest,
  QuoteEntry,
  MonitoringEntry,
  AlertEntry,
} from '../types';

export class AeroMonitorDB extends Dexie {
  clients!: Table<Client, number>;
  requests!: Table<FlightRequest, number>;
  quotes!: Table<QuoteEntry, number>;
  monitoring!: Table<MonitoringEntry, number>;
  alerts!: Table<AlertEntry, number>;

  constructor() {
    super('AeroMonitorAI');

    this.version(1).stores({
      clients: '++id, name, whatsapp, createdAt',
      requests:
        '++id, clientId, status, origin, destination, departureDate, createdAt',
      quotes: '++id, requestId, airline, source, priceSource, consultedAt',
      monitoring: '++id, requestId, createdAt',
      alerts: '++id, requestId, type, createdAt',
    });
  }
}

export const db = new AeroMonitorDB();

// ─── Helpers de Cliente ───────────────────────────────────────

export const clientsDB = {
  async getAll(): Promise<Client[]> {
    return db.clients.orderBy('name').toArray();
  },
  async getById(id: number): Promise<Client | undefined> {
    return db.clients.get(id);
  },
  async create(data: Omit<Client, 'id'>): Promise<number> {
    return db.clients.add(data);
  },
  async update(id: number, data: Partial<Client>): Promise<void> {
    await db.clients.update(id, { ...data, updatedAt: new Date().toISOString() });
  },
  async delete(id: number): Promise<void> {
    // Exclui também solicitações relacionadas
    const relatedRequests = await db.requests
      .where('clientId')
      .equals(id)
      .primaryKeys();
    for (const rid of relatedRequests) {
      await db.quotes.where('requestId').equals(rid as number).delete();
      await db.monitoring.where('requestId').equals(rid as number).delete();
      await db.alerts.where('requestId').equals(rid as number).delete();
    }
    await db.requests.where('clientId').equals(id).delete();
    await db.clients.delete(id);
  },
  async search(query: string): Promise<Client[]> {
    const q = query.toLowerCase();
    return db.clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.whatsapp.includes(q)
      )
      .toArray();
  },
};

// ─── Helpers de Solicitação ───────────────────────────────────

export const requestsDB = {
  async getAll(): Promise<FlightRequest[]> {
    return db.requests.orderBy('createdAt').reverse().toArray();
  },
  async getByClientId(clientId: number): Promise<FlightRequest[]> {
    return db.requests.where('clientId').equals(clientId).toArray();
  },
  async getById(id: number): Promise<FlightRequest | undefined> {
    return db.requests.get(id);
  },
  async create(data: Omit<FlightRequest, 'id'>): Promise<number> {
    return db.requests.add(data);
  },
  async update(id: number, data: Partial<FlightRequest>): Promise<void> {
    await db.requests.update(id, { ...data, updatedAt: new Date().toISOString() });
  },
  async delete(id: number): Promise<void> {
    await db.quotes.where('requestId').equals(id).delete();
    await db.monitoring.where('requestId').equals(id).delete();
    await db.alerts.where('requestId').equals(id).delete();
    await db.requests.delete(id);
  },
  async getByStatus(status: string): Promise<FlightRequest[]> {
    return db.requests.where('status').equals(status).toArray();
  },
};

// ─── Helpers de Cotação ───────────────────────────────────────

export const quotesDB = {
  async getByRequestId(requestId: number): Promise<QuoteEntry[]> {
    return db.quotes
      .where('requestId')
      .equals(requestId)
      .sortBy('consultedAt');
  },
  async getRecent(limit = 10): Promise<QuoteEntry[]> {
    return db.quotes.orderBy('consultedAt').reverse().limit(limit).toArray();
  },
  async create(data: Omit<QuoteEntry, 'id'>): Promise<number> {
    return db.quotes.add(data);
  },
  async update(id: number, data: Partial<QuoteEntry>): Promise<void> {
    await db.quotes.update(id, data);
  },
  async delete(id: number): Promise<void> {
    await db.quotes.delete(id);
  },
  // Marca cotações antigas como desatualizadas (> 24h)
  async markOutdated(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.quotes
      .where('consultedAt')
      .below(cutoff)
      .modify({ isOutdated: true });
  },
};

// ─── Helpers de Monitoramento ─────────────────────────────────

export const monitoringDB = {
  async getAll(): Promise<MonitoringEntry[]> {
    // Booleanos não são chaves válidas no IndexedDB: filtramos em memória.
    return db.monitoring.filter((m) => m.isActive).toArray();
  },
  async getByRequestId(requestId: number): Promise<MonitoringEntry | undefined> {
    return db.monitoring.where('requestId').equals(requestId).first();
  },
  async create(data: Omit<MonitoringEntry, 'id'>): Promise<number> {
    return db.monitoring.add(data);
  },
  async update(id: number, data: Partial<MonitoringEntry>): Promise<void> {
    await db.monitoring.update(id, { ...data, updatedAt: new Date().toISOString() });
  },
};

// ─── Helpers de Alerta ────────────────────────────────────────

export const alertsDB = {
  async getUnread(): Promise<AlertEntry[]> {
    return db.alerts.filter((a) => !a.isRead && !a.isDismissed).toArray();
  },
  async getAll(): Promise<AlertEntry[]> {
    return db.alerts.orderBy('createdAt').reverse().toArray();
  },
  async create(data: Omit<AlertEntry, 'id'>): Promise<number> {
    return db.alerts.add(data);
  },
  async markRead(id: number): Promise<void> {
    await db.alerts.update(id, { isRead: true });
  },
  async dismiss(id: number): Promise<void> {
    await db.alerts.update(id, { isDismissed: true, isRead: true });
  },
  async countUnread(): Promise<number> {
    return db.alerts.filter((a) => !a.isRead && !a.isDismissed).count();
  },
};

// ─── Backup / Restore ─────────────────────────────────────────

export async function exportBackup(): Promise<string> {
  const [clients, requests, quotes, monitoring, alerts] = await Promise.all([
    db.clients.toArray(),
    db.requests.toArray(),
    db.quotes.toArray(),
    db.monitoring.toArray(),
    db.alerts.toArray(),
  ]);
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), clients, requests, quotes, monitoring, alerts },
    null,
    2
  );
}

export async function importBackup(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (!data.version || !data.clients) throw new Error('Arquivo de backup inválido.');

  await db.transaction('rw', [db.clients, db.requests, db.quotes, db.monitoring, db.alerts], async () => {
    await db.clients.clear();
    await db.requests.clear();
    await db.quotes.clear();
    await db.monitoring.clear();
    await db.alerts.clear();
    await db.clients.bulkAdd(data.clients);
    await db.requests.bulkAdd(data.requests);
    await db.quotes.bulkAdd(data.quotes);
    await db.monitoring.bulkAdd(data.monitoring);
    await db.alerts.bulkAdd(data.alerts);
  });
}
