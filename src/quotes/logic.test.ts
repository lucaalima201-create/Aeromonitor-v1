import { describe, it, expect } from 'vitest';
import { compareQuoteToRequest, findBestComparable, hasBlocking, quoteToComparable } from './logic';
import type { FlightRequest, QuoteEntry } from '../types';

const req = (o: Partial<FlightRequest> = {}): FlightRequest => ({
  id: 1, clientId: 1, origin: 'Aracaju', originCode: 'AJU', destination: 'São Paulo', destinationCode: 'SAO',
  departureDate: '2027-02-15', returnDate: '2027-02-22', tripType: 'round_trip',
  adults: 2, children: 0, infants: 0, baggagePreference: '23kg', directFlightPreference: false,
  flexibleDates: false, currency: 'BRL', status: 'new', createdAt: '', updatedAt: '', ...o,
});

const quote = (o: Partial<QuoteEntry> = {}): QuoteEntry => ({
  id: 1, requestId: 1, airline: 'LATAM', source: 'Google Flights', origin: 'Aracaju', destination: 'São Paulo',
  originCode: 'AJU', destinationCode: 'GRU',
  departureDateTime: '2027-02-15T08:00', arrivalDateTime: '2027-02-15T11:00',
  returnDepartureDateTime: '2027-02-22T18:00', returnArrivalDateTime: '2027-02-22T21:00',
  stops: 0, durationMinutes: 180, basePrice: 700, taxes: 50, baggageIncluded: '23kg', currency: 'BRL',
  passengers: 2, totalPrice: 1500, priceSource: 'manual', consultedAt: new Date().toISOString(),
  isOutdated: false, ...o,
});

describe('compareQuoteToRequest', () => {
  it('oferta idêntica não gera divergência (GRU está dentro de SAO)', () => {
    expect(compareQuoteToRequest(quoteToComparable(quote()), req())).toEqual([]);
  });
  it('detecta rota diferente', () => {
    const d = compareQuoteToRequest(quoteToComparable(quote({ destinationCode: 'BSB', destination: 'Brasília' })), req());
    expect(d.some((x) => x.field === 'route')).toBe(true);
    expect(hasBlocking(d)).toBe(true);
  });
  it('detecta data de ida/volta diferente e menciona flexibilidade', () => {
    const q = quote({ departureDateTime: '2027-02-16T08:00', returnDepartureDateTime: '2027-02-23T18:00' });
    const d = compareQuoteToRequest(quoteToComparable(q), req({ flexibleDates: true }));
    expect(d.filter((x) => x.field === 'dates')).toHaveLength(2);
    expect(d[0].message).toContain('flexíveis');
  });
  it('ida e volta sem data de volta na oferta é divergência', () => {
    const d = compareQuoteToRequest(quoteToComparable(quote({ returnDepartureDateTime: undefined })), req());
    expect(d.some((x) => x.field === 'dates')).toBe(true);
  });
  it('detecta quantidade de passageiros diferente', () => {
    const d = compareQuoteToRequest(quoteToComparable(quote({ passengers: 1 })), req());
    expect(d.some((x) => x.field === 'passengers')).toBe(true);
  });
  it('bagagem inferior é aviso não bloqueante', () => {
    const d = compareQuoteToRequest(quoteToComparable(quote({ baggageIncluded: 'carry_on' })), req());
    expect(d).toHaveLength(1);
    expect(d[0].field).toBe('baggage');
    expect(hasBlocking(d)).toBe(false);
  });
  it('sem códigos, compara texto ignorando acentos e caixa', () => {
    const r = req({ originCode: undefined, destinationCode: undefined, destination: 'Sao Paulo' });
    const q = quote({ originCode: undefined, destinationCode: undefined, destination: 'SÃO PAULO' });
    expect(compareQuoteToRequest(quoteToComparable(q), r)).toEqual([]);
  });
});

describe('findBestComparable', () => {
  it('escolhe a menor oferta comparável e explica exclusões', () => {
    const quotes = [
      quote({ id: 1, totalPrice: 1500 }),
      quote({ id: 2, airline: 'GOL', totalPrice: 1400 }),
      quote({ id: 3, airline: 'Azul', totalPrice: 1000, baggageIncluded: 'none' }),
      quote({ id: 4, airline: 'X', totalPrice: 900, departureDateTime: '2027-02-17T08:00' }),
      quote({ id: 5, airline: 'Y', totalPrice: 800, consultedAt: new Date(Date.now() - 30 * 3600e3).toISOString() }),
    ];
    const r = findBestComparable(quotes, req());
    expect(r.best?.id).toBe(2);
    expect(r.excluded[3]).toContain('Bagagem inferior à desejada');
    expect(r.excluded[4][0]).toContain('diferentes');
    expect(r.excluded[5]).toContain('Consulta com mais de 24h');
  });
  it('sem cotações comparáveis retorna null', () => {
    const r = findBestComparable([quote({ passengers: 3 })], req());
    expect(r.best).toBeNull();
    expect(r.note).toBeTruthy();
  });
  it('preferência por voo direto restringe aos diretos quando existem', () => {
    const quotes = [quote({ id: 1, stops: 1, totalPrice: 1000 }), quote({ id: 2, stops: 0, totalPrice: 1300 })];
    expect(findBestComparable(quotes, req({ directFlightPreference: true })).best?.id).toBe(2);
    expect(findBestComparable(quotes, req({ directFlightPreference: false })).best?.id).toBe(1);
  });
  it('lista vazia', () => {
    expect(findBestComparable([], req()).best).toBeNull();
  });
});
