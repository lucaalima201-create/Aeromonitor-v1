// ============================================================
// AeroMonitor AI — Regras de cotações vinculadas a solicitações (puras)
// ============================================================
import type { BaggageOption, FlightRequest, QuoteEntry } from '../types';
import { codesMatch } from '../data/airportSearch';

export const BAGGAGE_RANK: Record<BaggageOption, number> = {
  none: 0,
  carry_on: 1,
  '23kg': 2,
  '32kg': 3,
};

export interface QuoteComparable {
  origin: string;
  destination: string;
  originCode?: string;
  destinationCode?: string;
  /** YYYY-MM-DD */
  departureDate: string;
  /** YYYY-MM-DD, vazio se a oferta não tem volta */
  returnDate?: string;
  passengers: number;
  baggageIncluded?: BaggageOption;
}

export interface Deviation {
  field: 'route' | 'dates' | 'passengers' | 'baggage';
  message: string;
  /** Exige justificativa registrada para salvar. */
  blocking: boolean;
}

export function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function quoteToComparable(q: QuoteEntry): QuoteComparable {
  return {
    origin: q.origin,
    destination: q.destination,
    originCode: q.originCode,
    destinationCode: q.destinationCode,
    departureDate: q.departureDateTime.slice(0, 10),
    returnDate: q.returnDepartureDateTime?.slice(0, 10) || undefined,
    passengers: q.passengers,
    baggageIncluded: q.baggageIncluded,
  };
}

function sameLocation(
  reqText: string, reqCode: string | undefined,
  offText: string, offCode: string | undefined
): boolean {
  if (reqCode && offCode) return codesMatch(reqCode, offCode);
  return norm(reqText) === norm(offText);
}

const br = (iso: string) => iso.split('-').reverse().join('/');

/** Compara a oferta com a solicitação original. Nunca altera nenhum dos dois. */
export function compareQuoteToRequest(q: QuoteComparable, r: FlightRequest): Deviation[] {
  const out: Deviation[] = [];

  if (!sameLocation(r.origin, r.originCode, q.origin, q.originCode)) {
    out.push({ field: 'route', blocking: true,
      message: `Origem da oferta (${q.origin}${q.originCode ? ` ${q.originCode}` : ''}) difere da solicitação (${r.origin}${r.originCode ? ` ${r.originCode}` : ''}).` });
  }
  if (!sameLocation(r.destination, r.destinationCode, q.destination, q.destinationCode)) {
    out.push({ field: 'route', blocking: true,
      message: `Destino da oferta (${q.destination}${q.destinationCode ? ` ${q.destinationCode}` : ''}) difere da solicitação (${r.destination}${r.destinationCode ? ` ${r.destinationCode}` : ''}).` });
  }

  if (q.departureDate && q.departureDate !== r.departureDate) {
    out.push({ field: 'dates', blocking: true,
      message: `Data de ida da oferta (${br(q.departureDate)}) difere da solicitação (${br(r.departureDate)})${r.flexibleDates ? ' — cliente aceita datas flexíveis' : ''}.` });
  }
  if (r.tripType === 'round_trip') {
    if (!q.returnDate) {
      out.push({ field: 'dates', blocking: true,
        message: 'A solicitação é de ida e volta, mas a oferta não tem data de volta informada.' });
    } else if (r.returnDate && q.returnDate !== r.returnDate) {
      out.push({ field: 'dates', blocking: true,
        message: `Data de volta da oferta (${br(q.returnDate)}) difere da solicitação (${br(r.returnDate)})${r.flexibleDates ? ' — cliente aceita datas flexíveis' : ''}.` });
    }
  } else if (q.returnDate) {
    out.push({ field: 'dates', blocking: true,
      message: 'A solicitação é somente ida, mas a oferta tem data de volta.' });
  }

  const pax = r.adults + r.children + r.infants;
  if (q.passengers !== pax) {
    out.push({ field: 'passengers', blocking: true,
      message: `A oferta é para ${q.passengers} passageiro(s); a solicitação tem ${pax}.` });
  }

  if (q.baggageIncluded && BAGGAGE_RANK[q.baggageIncluded] < BAGGAGE_RANK[r.baggagePreference]) {
    out.push({ field: 'baggage', blocking: false,
      message: 'A bagagem incluída na oferta é menor que a desejada pelo cliente.' });
  }
  return out;
}

export const hasBlocking = (d: Deviation[]) => d.some((x) => x.blocking);

export interface BestComparableResult {
  best: QuoteEntry | null;
  /** Motivos pelos quais cada cotação ficou fora da comparação (por id). */
  excluded: Record<number, string[]>;
  note?: string;
}

/**
 * Melhor oferta COMPARÁVEL: mesma rota/datas/passageiros da solicitação,
 * bagagem >= desejada, mesma moeda, consulta com menos de 24h.
 * Se o cliente prefere voo direto e existe direto elegível, só diretos competem.
 */
export function findBestComparable(
  quotes: QuoteEntry[], request: FlightRequest, now = Date.now()
): BestComparableResult {
  const excluded: Record<number, string[]> = {};
  const eligible: QuoteEntry[] = [];

  for (const q of quotes) {
    const reasons: string[] = [];
    const id = q.id ?? -1;
    const devs = compareQuoteToRequest(quoteToComparable(q), request);
    if (hasBlocking(devs)) reasons.push('Rota, datas ou passageiros diferentes da solicitação');
    if (devs.some((d) => d.field === 'baggage')) reasons.push('Bagagem inferior à desejada');
    if (q.currency !== request.currency) reasons.push('Moeda diferente');
    if (now - new Date(q.consultedAt).getTime() > 24 * 3600e3) reasons.push('Consulta com mais de 24h');
    if (reasons.length) excluded[id] = reasons; else eligible.push(q);
  }

  if (eligible.length === 0) {
    return { best: null, excluded, note: quotes.length ? 'Nenhuma cotação é comparável com a solicitação.' : undefined };
  }

  let pool = eligible;
  let note: string | undefined;
  if (request.directFlightPreference) {
    const direct = eligible.filter((q) => q.stops === 0);
    if (direct.length) pool = direct;
    else note = 'O cliente prefere voo direto, mas nenhuma oferta comparável é direta.';
  }
  const best = pool.reduce((m, q) =>
    q.totalPrice < m.totalPrice || (q.totalPrice === m.totalPrice && q.stops < m.stops) ? q : m);
  return { best, excluded, note };
}
