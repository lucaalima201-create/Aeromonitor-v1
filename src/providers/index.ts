// ============================================================
// AeroMonitor AI — Provedores de Busca (Fase 2: links semiautomáticos)
// ============================================================

import { isMetroCode } from '../data/airportSearch';

export type IntegrationMode = 'url_params' | 'home_link' | 'api' | 'manual';
export type IntegrationStatus = 'active' | 'partial' | 'manual_only' | 'unavailable';

export interface SearchParams {
  origin: string;
  originCode?: string;
  destination: string;
  destinationCode?: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;   // YYYY-MM-DD
  adults: number;
  children: number;
  infants: number;
  tripType: 'one_way' | 'round_trip';
}

export interface FlightProvider {
  id: string;
  name: string;
  logoColor: string;
  integrationMode: IntegrationMode;
  integrationStatus: IntegrationStatus;
  pricesAreReal: boolean;
  lastVerified: string;
  buildSearchUrl: (params: SearchParams) => string | null;
  homeUrl: string;
  notes: string;
}

// ─── Google Flights ───────────────────────────────────────────
// Usa parâmetro ?q= com linguagem natural. Documentado e testado.
const googleFlights: FlightProvider = {
  id: 'google_flights',
  name: 'Google Flights',
  logoColor: '#4285F4',
  integrationMode: 'url_params',
  integrationStatus: 'partial',
  pricesAreReal: true,
  lastVerified: '2024-11-01',
  homeUrl: 'https://www.google.com/travel/flights',
  notes: 'Abre pesquisa pré-preenchida via parâmetro ?q= (linguagem natural). Sem API pública. Resultados reais do Google.',
  buildSearchUrl(p: SearchParams): string {
    const type = p.tripType === 'round_trip' ? 'Voos de ida e volta' : 'Voos de ida';
    const returnPart = p.returnDate ? ` até ${p.returnDate}` : '';
    // Códigos de aeroporto são mais precisos; para áreas metropolitanas (SAO/RIO) usa o nome da cidade.
    const place = (city: string, code?: string) => (code && !isMetroCode(code) ? code : city);
    const q = `${type} de ${place(p.origin, p.originCode)} para ${place(p.destination, p.destinationCode)} em ${p.departureDate}${returnPart} ${p.adults} adulto${p.adults > 1 ? 's' : ''}`;
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&hl=pt-BR&gl=br&curr=BRL`;
  },
};

// ─── Skyscanner ───────────────────────────────────────────────
// Usa estrutura de URL documentada publicamente (sem mediaPartnerId obrigatório).
const skyscanner: FlightProvider = {
  id: 'skyscanner',
  name: 'Skyscanner',
  logoColor: '#0770E3',
  integrationMode: 'url_params',
  integrationStatus: 'partial',
  pricesAreReal: true,
  lastVerified: '2024-11-01',
  homeUrl: 'https://www.skyscanner.com.br',
  notes: 'URL com parâmetros de rota e data. Pode exigir verificação anti-bot. Resultados reais do Skyscanner.',
  buildSearchUrl(p: SearchParams): string | null {
    // Exige códigos IATA reais (selecionados na base de aeroportos). Nunca deriva do nome da cidade.
    if (!p.originCode || !p.destinationCode) return null;
    // Formato de data do Skyscanner: YYMMDD (ex.: 2027-02-15 -> 270215). Código em minúsculas.
    const yymmdd = (iso: string) => iso.slice(2).replace(/-/g, '');
    const dates = p.tripType === 'round_trip' && p.returnDate
      ? `${yymmdd(p.departureDate)}/${yymmdd(p.returnDate)}/`
      : `${yymmdd(p.departureDate)}/`;
    return `https://www.skyscanner.com.br/transport/flights/${p.originCode.toLowerCase()}/${p.destinationCode.toLowerCase()}/${dates}?adults=${p.adults}&children=${p.children}&infants=${p.infants}&currency=BRL&locale=pt-BR&market=BR`;
  },
};

// ─── LATAM Airlines ──────────────────────────────────────────
// Site SPA — parâmetros de URL não são confiáveis. Link vai para a home.
const latam: FlightProvider = {
  id: 'latam',
  name: 'LATAM Airlines',
  logoColor: '#E60018',
  integrationMode: 'home_link',
  integrationStatus: 'manual_only',
  pricesAreReal: false,
  lastVerified: '2024-11-01',
  homeUrl: 'https://www.latamairlines.com/br/pt',
  notes: 'Site SPA com tokens de sessão internos. URL parametrizada não é suportada. Use cópia rápida dos dados.',
  buildSearchUrl(): null {
    return null;
  },
};

// ─── GOL Linhas Aéreas ────────────────────────────────────────
const gol: FlightProvider = {
  id: 'gol',
  name: 'GOL Linhas Aéreas',
  logoColor: '#F97316',
  integrationMode: 'home_link',
  integrationStatus: 'manual_only',
  pricesAreReal: false,
  lastVerified: '2024-11-01',
  homeUrl: 'https://www.voegol.com.br',
  notes: 'Site SPA com API interna. URL parametrizada não é suportada. Use cópia rápida dos dados.',
  buildSearchUrl(): null {
    return null;
  },
};

// ─── Azul Linhas Aéreas ───────────────────────────────────────
const azul: FlightProvider = {
  id: 'azul',
  name: 'Azul Linhas Aéreas',
  logoColor: '#003DA5',
  integrationMode: 'home_link',
  integrationStatus: 'manual_only',
  pricesAreReal: false,
  lastVerified: '2024-11-01',
  homeUrl: 'https://www.voeazul.com.br',
  notes: 'API B2B requer autenticação de parceiro. URL pública parametrizada não disponível. Use cópia rápida dos dados.',
  buildSearchUrl(): null {
    return null;
  },
};

export const FLIGHT_PROVIDERS: FlightProvider[] = [
  googleFlights,
  skyscanner,
  latam,
  gol,
  azul,
];

export const PROVIDERS_BY_ID: Record<string, FlightProvider> = Object.fromEntries(
  FLIGHT_PROVIDERS.map((p) => [p.id, p])
);
