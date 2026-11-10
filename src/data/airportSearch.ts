// ============================================================
// AeroMonitor AI — Busca de aeroportos (cidade, nome do aeroporto ou código IATA)
// Base: src/data/airports.ts (OurAirports, domínio público).
// ============================================================
import { AIRPORTS } from './airports';

export interface AirportOption {
  /** Código IATA do aeroporto ou código metropolitano IATA (SAO, RIO). */
  code: string;
  city: string;
  state: string;
  /** Nome oficial do aeroporto (ou descrição da área metropolitana). */
  name: string;
  kind: 'airport' | 'metro';
  /** Texto principal exibido/armazenado, ex.: "Aracaju (AJU)". */
  label: string;
}

/**
 * Códigos metropolitanos IATA ("todos os aeroportos da cidade").
 * ATENÇÃO: lista curta, adicionada manualmente (não vem do OurAirports).
 * Só são oferecidos quando TODOS os aeroportos membros existem na base.
 */
export const METRO_AREAS: { code: string; city: string; state: string; members: string[] }[] = [
  { code: 'SAO', city: 'São Paulo', state: 'SP', members: ['GRU', 'CGH', 'VCP'] },
  { code: 'RIO', city: 'Rio de Janeiro', state: 'RJ', members: ['GIG', 'SDU'] },
];

export function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const airportOptions: AirportOption[] = AIRPORTS.map((a) => ({
  code: a.iata,
  city: a.city,
  state: a.state,
  name: a.name,
  kind: 'airport' as const,
  label: `${a.city} (${a.iata})`,
}));

const metroOptions: AirportOption[] = METRO_AREAS
  .filter((m) => m.members.every((c) => AIRPORTS.some((a) => a.iata === c)))
  .map((m) => ({
    code: m.code,
    city: m.city,
    state: m.state,
    name: `Todos os aeroportos: ${m.members.join(', ')}`,
    kind: 'metro' as const,
    label: `${m.city} – todos os aeroportos (${m.code})`,
  }));

export const ALL_OPTIONS: AirportOption[] = [...metroOptions, ...airportOptions];

export function getOptionByCode(code: string | undefined): AirportOption | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  return ALL_OPTIONS.find((o) => o.code === c);
}

export const isMetroCode = (code: string | undefined) =>
  !!code && METRO_AREAS.some((m) => m.code === code.toUpperCase());

/** Dois códigos são compatíveis se iguais ou se um é a área metropolitana do outro. */
export function codesMatch(a: string, b: string): boolean {
  const x = a.toUpperCase(), y = b.toUpperCase();
  if (x === y) return true;
  return METRO_AREAS.some(
    (m) => (m.code === x && m.members.includes(y)) || (m.code === y && m.members.includes(x))
  );
}

/** Texto de exibição: "Aracaju (AJU)" ou só o texto livre, se não houver código. */
export function formatLocation(city: string, code?: string): string {
  if (!code) return city;
  const o = getOptionByCode(code);
  if (o?.kind === 'metro') return `${city} – todos os aeroportos (${code})`;
  return `${city} (${code})`;
}

function score(o: AirportOption, q: string): number {
  const code = o.code.toLowerCase();
  const city = norm(o.city);
  const name = norm(o.name);
  if (code === q) return 100;
  if (code.startsWith(q)) return 80;
  if (city.startsWith(q)) return o.kind === 'metro' ? 76 : 70;
  if (city.split(/[\s/-]+/).some((w) => w.startsWith(q))) return 55;
  if (name.split(/[\s/-]+/).some((w) => w.startsWith(q))) return 50;
  if (city.includes(q) || name.includes(q)) return 30;
  return 0;
}

export function searchAirports(query: string, limit = 8): AirportOption[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return ALL_OPTIONS
    .map((o) => ({ o, s: score(o, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.o.city.localeCompare(b.o.city) || a.o.code.localeCompare(b.o.code))
    .slice(0, limit)
    .map((x) => x.o);
}
