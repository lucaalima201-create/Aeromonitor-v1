import { describe, it, expect } from 'vitest';
import { recordPrice, isStale, validatePrice } from './logic';
import type { MonitoringEntry } from '../types';

const base = (over: Partial<MonitoringEntry> = {}): MonitoringEntry => ({
  requestId: 1,
  targetPrice: 750,
  currency: 'BRL',
  isActive: true,
  priceHistory: [],
  createdAt: '2027-01-01T10:00:00.000Z',
  updatedAt: '2027-01-01T10:00:00.000Z',
  ...over,
});

describe('recordPrice', () => {
  it('primeiro preço define último, menor e maior', () => {
    const { entry } = recordPrice(base(), { price: 980, source: 'Google Flights' });
    expect(entry.lastKnownPrice).toBe(980);
    expect(entry.lowestPrice).toBe(980);
    expect(entry.highestPrice).toBe(980);
    expect(entry.priceHistory).toHaveLength(1);
    expect(entry.priceHistory[0].priceSource).toBe('manual');
  });

  it('sequência 980→920→850→790 atualiza métricas e histórico', () => {
    let e = base({ targetPrice: 700 });
    for (const p of [980, 920, 850, 790]) {
      e = recordPrice(e, { price: p, source: 'Google Flights' }).entry;
    }
    expect(e.priceHistory.map((h) => h.price)).toEqual([980, 920, 850, 790]);
    expect(e.lastKnownPrice).toBe(790);
    expect(e.lowestPrice).toBe(790);
    expect(e.highestPrice).toBe(980);
  });

  it('alerta quando preço atinge o alvo', () => {
    const { alerts } = recordPrice(base(), { price: 750, source: 'LATAM' });
    expect(alerts.map((a) => a.type)).toContain('price_below_target');
  });

  it('não alerta alvo quando preço está acima', () => {
    const { alerts } = recordPrice(base(), { price: 800, source: 'LATAM' });
    expect(alerts).toHaveLength(0);
  });

  it('alerta novo menor preço e queda na mesma fonte', () => {
    const e1 = recordPrice(base(), { price: 900, source: 'Skyscanner' }).entry;
    const { alerts } = recordPrice(e1, { price: 850, source: 'Skyscanner' });
    const types = alerts.map((a) => a.type);
    expect(types).toContain('new_lowest_price');
    expect(types).toContain('price_drop');
  });

  it('queda NÃO é comparável entre fontes diferentes', () => {
    const e1 = recordPrice(base(), { price: 900, source: 'Skyscanner' }).entry;
    const { alerts } = recordPrice(e1, { price: 850, source: 'GOL' });
    const types = alerts.map((a) => a.type);
    expect(types).not.toContain('price_drop');
    expect(types).toContain('new_lowest_price');
  });

  it('rejeita preços inválidos e não muta a entrada original', () => {
    const original = base();
    expect(() => recordPrice(original, { price: 0, source: 'x' })).toThrow();
    expect(() => recordPrice(original, { price: NaN, source: 'x' })).toThrow();
    recordPrice(original, { price: 500, source: 'x' });
    expect(original.priceHistory).toHaveLength(0);
  });
});

describe('validatePrice', () => {
  it('valida valores', () => {
    expect(validatePrice(10)).toBeNull();
    expect(validatePrice(-1)).not.toBeNull();
  });
});

describe('isStale', () => {
  const now = new Date('2027-01-10T10:00:00.000Z').getTime();
  it('detecta monitoramento sem atualização', () => {
    expect(isStale(base(), 3, now)).toBe(true);
  });
  it('não marca monitoramento recente ou pausado', () => {
    expect(isStale(base({ lastCheckedAt: '2027-01-10T09:00:00.000Z' }), 3, now)).toBe(false);
    expect(isStale(base({ isActive: false }), 3, now)).toBe(false);
  });
});
