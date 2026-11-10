import { describe, it, expect } from 'vitest';
import {
  formatCurrency, formatDuration, percentageDiff, findLowestQuote,
  findBestDirectFlight, buildWhatsAppLink, formatPhone, isQuoteOutdated, isValidPhone,
} from './index';
import type { QuoteEntry } from '../types';

const q = (over: Partial<QuoteEntry>): QuoteEntry => ({
  id: 1, requestId: 1, airline: 'X', source: 'manual', origin: 'AJU', destination: 'GRU',
  departureDateTime: '', arrivalDateTime: '', stops: 0, durationMinutes: 120,
  basePrice: 100, taxes: 0, baggageIncluded: 'none', currency: 'BRL', passengers: 1,
  totalPrice: 100, priceSource: 'manual', consultedAt: new Date().toISOString(),
  isOutdated: false, ...over,
});

describe('utils', () => {
  it('formata moeda BRL', () => {
    expect(formatCurrency(790).replace(/\s/g, ' ')).toBe('R$ 790,00');
  });
  it('formata duração', () => {
    expect(formatDuration(150)).toBe('2h30min');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45min');
  });
  it('diferença percentual', () => {
    expect(percentageDiff(1000, 790)).toBeCloseTo(-21);
    expect(percentageDiff(0, 10)).toBe(0);
  });
  it('menor cotação e melhor direto', () => {
    const list = [q({ id: 1, totalPrice: 900, stops: 0 }), q({ id: 2, totalPrice: 700, stops: 1 })];
    expect(findLowestQuote(list)?.id).toBe(2);
    expect(findBestDirectFlight(list)?.id).toBe(1);
    expect(findLowestQuote([])).toBeNull();
  });
  it('link do WhatsApp', () => {
    expect(buildWhatsAppLink('(79) 99999-0000', 'Olá')).toBe('https://wa.me/79999990000?text=Ol%C3%A1');
  });
  it('formata telefone', () => {
    expect(formatPhone('79999990000')).toBe('(79) 99999-0000');
  });
  it('valida telefone BR nos formatos comuns', () => {
    for (const ok of ['(79) 99999-0000', '79999990000', '+55 79 99999-0000', '(11) 91234-5678', '(79) 3211-0000']) {
      expect(isValidPhone(ok), ok).toBe(true);
    }
    for (const bad of ['abc', '1234', '(79) 9999', '79 99999-0000 x']) {
      expect(isValidPhone(bad), bad).toBe(false);
    }
  });
  it('detecta cotação desatualizada (>24h)', () => {
    expect(isQuoteOutdated(new Date(Date.now() - 25 * 3600e3).toISOString())).toBe(true);
    expect(isQuoteOutdated(new Date().toISOString())).toBe(false);
  });
});
