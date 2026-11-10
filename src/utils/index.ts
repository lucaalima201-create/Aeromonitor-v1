// ============================================================
// AeroMonitor AI — Utilitários
// ============================================================

import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuoteEntry } from '../types';

/** Formata número como moeda BRL */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formata data ISO para exibição */
export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

/** Formata data e hora ISO */
export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

/** Converte minutos em texto legível */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}min`;
}

/** Verifica se cotação está desatualizada (> 24h) */
export function isQuoteOutdated(consultedAt: string): boolean {
  try {
    const diff = Date.now() - parseISO(consultedAt).getTime();
    return diff > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

/** Calcula diferença percentual entre dois preços */
export function percentageDiff(original: number, newer: number): number {
  if (original === 0) return 0;
  return ((newer - original) / original) * 100;
}

/** Encontra a menor cotação de uma lista */
export function findLowestQuote(quotes: QuoteEntry[]): QuoteEntry | null {
  if (quotes.length === 0) return null;
  return quotes.reduce((min, q) => (q.totalPrice < min.totalPrice ? q : min));
}

/** Encontra a melhor cotação sem escalas */
export function findBestDirectFlight(quotes: QuoteEntry[]): QuoteEntry | null {
  const direct = quotes.filter((q) => q.stops === 0);
  return findLowestQuote(direct);
}

/** Calcula dias até a viagem */
export function daysUntilTravel(departureDate: string): number {
  try {
    return differenceInDays(parseISO(departureDate), new Date());
  } catch {
    return -1;
  }
}

/** Verifica se a data de viagem já passou */
export function hasTravelPassed(departureDate: string): boolean {
  try {
    return isPast(parseISO(departureDate));
  } catch {
    return false;
  }
}

/** Gera link do WhatsApp Web com texto pré-preenchido */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

/** Valida telefone BR: só dígitos e separadores comuns; 10–11 dígitos (DDD+número) ou 12–13 com DDI 55. */
export function isValidPhone(phone: string): boolean {
  if (!/^\+?[\d\s\-().]+$/.test(phone.trim())) return false;
  const d = phone.replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return true;
  return (d.length === 12 || d.length === 13) && d.startsWith('55');
}

/** Formata número de telefone */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return phone;
}

/** Trunca texto */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/** Gera ID único simples */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Pluraliza palavra */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
