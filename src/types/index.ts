// ============================================================
// AeroMonitor AI — Tipos Centralizados
// ============================================================

export type TripType = 'one_way' | 'round_trip';

export type RequestStatus =
  | 'new'
  | 'awaiting_quote'
  | 'monitoring'
  | 'proposal_sent'
  | 'negotiation'
  | 'sale_completed'
  | 'sale_lost'
  | 'cancelled';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Nova Solicitação',
  awaiting_quote: 'Aguardando Cotação',
  monitoring: 'Em Monitoramento',
  proposal_sent: 'Proposta Enviada',
  negotiation: 'Em Negociação',
  sale_completed: 'Venda Concluída',
  sale_lost: 'Venda Perdida',
  cancelled: 'Cancelada',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  awaiting_quote: 'bg-yellow-100 text-yellow-800',
  monitoring: 'bg-purple-100 text-purple-800',
  proposal_sent: 'bg-orange-100 text-orange-800',
  negotiation: 'bg-indigo-100 text-indigo-800',
  sale_completed: 'bg-green-100 text-green-800',
  sale_lost: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export type BaggageOption = 'none' | 'carry_on' | '23kg' | '32kg';
export const BAGGAGE_LABELS: Record<BaggageOption, string> = {
  none: 'Sem bagagem',
  carry_on: 'Apenas bagagem de mão',
  '23kg': 'Despachada 23kg',
  '32kg': 'Despachada 32kg',
};

export type PriceSource = 'manual' | 'email_alert' | 'api' | 'demonstration';
export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  manual: 'Inserido manualmente',
  email_alert: 'Alerta por e-mail',
  api: 'API autorizada',
  demonstration: 'Demonstrativo (não real)',
};

export type AlertType =
  | 'price_below_target'
  | 'new_lowest_price'
  | 'price_drop'
  | 'stale_monitoring'
  | 'travel_approaching'
  | 'proposal_pending';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_below_target: 'Preço abaixo do alvo',
  new_lowest_price: 'Novo menor preço registrado',
  price_drop: 'Queda de preço',
  stale_monitoring: 'Monitoramento sem atualização',
  travel_approaching: 'Viagem se aproximando',
  proposal_pending: 'Proposta aguardando retorno',
};

// ─── Entidades de banco ───────────────────────────────────────

export interface Client {
  id?: number;
  name: string;
  whatsapp: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlightRequest {
  id?: number;
  clientId: number;
  clientName?: string; // desnormalizado para exibição rápida
  origin: string;
  originCode?: string;
  destination: string;
  destinationCode?: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  adults: number;
  children: number;
  infants: number;
  baggagePreference: BaggageOption;
  directFlightPreference: boolean;
  flexibleDates: boolean;
  targetPrice?: number;
  currency: string;
  status: RequestStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteEntry {
  id?: number;
  requestId: number;
  airline: string;
  source: string; // Google Flights, Skyscanner, LATAM, GOL, Azul, etc.
  origin: string;
  destination: string;
  departureDateTime: string;
  /** Opcional: o formulário não pede mais a chegada, mas cotações antigas podem tê-la. */
  arrivalDateTime?: string;
  returnDepartureDateTime?: string;
  returnArrivalDateTime?: string;
  stops: number;
  durationMinutes: number;
  basePrice: number;
  taxes: number;
  baggageIncluded: BaggageOption;
  currency: string;
  passengers: number;
  totalPrice: number;
  offerLink?: string;
  priceSource: PriceSource;
  consultedAt: string;
  isOutdated: boolean;
  notes?: string;
  /** Códigos IATA da oferta (quando selecionados no formulário). */
  originCode?: string;
  destinationCode?: string;
  /** Divergências em relação à solicitação detectadas ao salvar (texto, para auditoria). */
  deviations?: string[];
  /** Justificativa informada pelo atendente para as divergências. */
  deviationNote?: string;
}

export interface MonitoringEntry {
  id?: number;
  requestId: number;
  targetPrice: number;
  lastKnownPrice?: number;
  lowestPrice?: number;
  highestPrice?: number;
  currency: string;
  isActive: boolean;
  priceHistory: PriceHistoryPoint[];
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryPoint {
  price: number;
  source: string;
  priceSource: PriceSource;
  recordedAt: string;
  airline?: string;
  notes?: string;
}

export interface AlertEntry {
  id?: number;
  requestId: number;
  clientName: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  relatedQuoteId?: number;
}

// ─── Tipos de UI ──────────────────────────────────────────────

export interface DashboardStats {
  totalClients: number;
  openRequests: number;
  monitoredRoutes: number;
  proposalsSent: number;
  salesCompleted: number;
  unreadAlerts: number;
  recentQuotes: QuoteEntry[];
  pendingClients: FlightRequest[];
}
