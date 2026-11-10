// ============================================================
// AeroMonitor AI — Lógica pura de monitoramento (Estratégia A: manual)
// Sem acesso a banco: facilita testes e futuras estratégias (e-mail, API).
// ============================================================
import type { AlertType, MonitoringEntry, PriceHistoryPoint } from '../types';

export interface RecordPriceInput {
  price: number;
  source: string;
  airline?: string;
  notes?: string;
  recordedAt?: string;
}

export interface PendingAlert {
  type: AlertType;
  message: string;
}

export function validatePrice(price: number): string | null {
  if (!Number.isFinite(price)) return 'Preço inválido';
  if (price <= 0) return 'O preço deve ser maior que zero';
  return null;
}

const brl = (v: number, currency: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(v);

/**
 * Registra um preço informado manualmente e recalcula último/menor/maior.
 * Retorna a entrada atualizada e os alertas que devem ser gerados.
 * Não altera o objeto original.
 */
export function recordPrice(
  entry: MonitoringEntry,
  input: RecordPriceInput
): { entry: MonitoringEntry; alerts: PendingAlert[] } {
  const error = validatePrice(input.price);
  if (error) throw new Error(error);

  const at = input.recordedAt ?? new Date().toISOString();
  const point: PriceHistoryPoint = {
    price: input.price,
    source: input.source.trim() || 'Não informada',
    priceSource: 'manual',
    recordedAt: at,
    airline: input.airline?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };

  const previousLowest = entry.lowestPrice;
  const history = [...entry.priceHistory, point];
  const prices = history.map((p) => p.price);

  const updated: MonitoringEntry = {
    ...entry,
    priceHistory: history,
    lastKnownPrice: input.price,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    lastCheckedAt: at,
    updatedAt: at,
  };

  const alerts: PendingAlert[] = [];
  const cur = entry.currency;

  if (entry.targetPrice > 0 && input.price <= entry.targetPrice) {
    alerts.push({
      type: 'price_below_target',
      message: `Preço ${brl(input.price, cur)} (${point.source}) está no alvo de ${brl(entry.targetPrice, cur)} ou abaixo.`,
    });
  }
  if (previousLowest !== undefined && input.price < previousLowest) {
    alerts.push({
      type: 'new_lowest_price',
      message: `Novo menor preço registrado: ${brl(input.price, cur)} (anterior: ${brl(previousLowest, cur)}).`,
    });
  }
  // Queda só é comparável com a consulta anterior da MESMA fonte.
  const comparable = [...entry.priceHistory]
    .reverse()
    .find((p) => p.source.toLowerCase() === point.source.toLowerCase());
  if (comparable && input.price < comparable.price) {
    alerts.push({
      type: 'price_drop',
      message: `Queda de ${brl(comparable.price - input.price, cur)} em relação à última consulta em ${point.source} (${brl(comparable.price, cur)} → ${brl(input.price, cur)}).`,
    });
  }

  return { entry: updated, alerts };
}

/** Monitoramento ativo sem atualização há mais de `days` dias. */
export function isStale(entry: MonitoringEntry, days = 3, now = Date.now()): boolean {
  if (!entry.isActive) return false;
  const last = entry.lastCheckedAt ?? entry.createdAt;
  return now - new Date(last).getTime() > days * 24 * 60 * 60 * 1000;
}
