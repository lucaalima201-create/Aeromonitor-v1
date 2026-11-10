// ============================================================
// AeroMonitor AI — Página: Cotações (Registro e Comparação)
// ============================================================
import { useEffect, useState } from 'react';
import {
  Plus, TrendingDown, AlertCircle, Award, Luggage, ArrowRight, Trash2, Edit2
} from 'lucide-react';
import { quotesDB, requestsDB, clientsDB } from '../db';
import type { QuoteEntry, FlightRequest } from '../types';
import { BAGGAGE_LABELS, PRICE_SOURCE_LABELS } from '../types';
import {
  Button, Card, Select, EmptyState, ConfirmDialog, PageHeader, Badge, AlertBanner
} from '../components/ui';
import {
  formatCurrency, formatDateTime, formatDuration,
  findLowestQuote, findBestDirectFlight, percentageDiff, isQuoteOutdated
} from '../utils';
import QuoteForm from './QuoteForm';

export default function Quotes() {
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [filterRequestId, setFilterRequestId] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editQuote, setEditQuote] = useState<QuoteEntry | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [reqs, cls] = await Promise.all([requestsDB.getAll(), clientsDB.getAll()]);
    const clientMap = Object.fromEntries(cls.map((c) => [c.id!, c.name]));
    const enriched = reqs.map((r) => ({ ...r, clientName: clientMap[r.clientId] || 'Desconhecido' }));
    setRequests(enriched);

    const q = await quotesDB.getRecent(200);
    setQuotes(q);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredQuotes = filterRequestId === 'all'
    ? quotes
    : quotes.filter((q) => String(q.requestId) === filterRequestId);

  const lowest = findLowestQuote(filteredQuotes);
  const bestDirect = findBestDirectFlight(filteredQuotes);

  const handleDelete = async () => {
    if (deleteId == null) return;
    await quotesDB.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const reqOptions = [
    { value: 'all', label: 'Todas as solicitações' },
    ...requests.map((r) => ({
      value: String(r.id),
      label: `${r.clientName} — ${r.origin} → ${r.destination}`,
    })),
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Cotações"
        subtitle="Registre e compare tarifas encontradas nas companhias"
        action={
          <Button onClick={() => { setEditQuote(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            Registrar Cotação
          </Button>
        }
      />

      <AlertBanner type="warning">
        <strong>Importante:</strong> Registre apenas tarifas reais encontradas nas companhias. Os preços
        aqui exibidos são os que você consultou manualmente — não são obtidos automaticamente. Ofertas
        com mais de 24h são marcadas como desatualizadas.
      </AlertBanner>

      {/* Filtro */}
      <div className="mt-4 mb-4">
        <Select
          value={filterRequestId}
          onChange={(e) => setFilterRequestId(e.target.value)}
          options={reqOptions}
        />
      </div>

      {/* Resumo comparativo */}
      {filteredQuotes.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {lowest && (
            <Card className="border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-800">Menor preço total</span>
              </div>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(lowest.totalPrice, lowest.currency)}
              </p>
              <p className="text-xs text-green-600">{lowest.airline} · {lowest.source}</p>
            </Card>
          )}
          {bestDirect && bestDirect.id !== lowest?.id && (
            <Card className="border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Melhor voo direto</span>
              </div>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(bestDirect.totalPrice, bestDirect.currency)}
              </p>
              <p className="text-xs text-blue-600">{bestDirect.airline} · {bestDirect.source}</p>
            </Card>
          )}
          {lowest && filteredQuotes.length > 1 && (() => {
            const highest = filteredQuotes.reduce((max, q) => q.totalPrice > max.totalPrice ? q : max);
            if (highest.id === lowest.id) return null;
            const diff = highest.totalPrice - lowest.totalPrice;
            const pct = percentageDiff(lowest.totalPrice, highest.totalPrice);
            return (
              <Card className="border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">Economia potencial</span>
                </div>
                <p className="text-xl font-bold text-orange-700">
                  {formatCurrency(diff, lowest.currency)}
                </p>
                <p className="text-xs text-orange-600">
                  {pct.toFixed(1)}% mais barato que o maior preço
                </p>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Lista de cotações */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<TrendingDown className="w-12 h-12" />}
          title="Nenhuma cotação registrada"
          description="Registre tarifas encontradas nas companhias aéreas para comparar."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              Registrar primeira cotação
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const outdated = isQuoteOutdated(quote.consultedAt);
            const isLowest = lowest?.id === quote.id;
            const req = requests.find((r) => r.id === quote.requestId);
            const hasIncompatibleBaggage = filteredQuotes.some(
              (q) => q.id !== quote.id && q.baggageIncluded !== quote.baggageIncluded
            );

            return (
              <Card
                key={quote.id}
                className={`${isLowest ? 'border-green-300' : ''} ${outdated ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header da cotação */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{quote.airline}</span>
                      {isLowest && <Badge className="bg-green-100 text-green-800">✓ Menor preço</Badge>}
                      {quote.stops === 0 && <Badge className="bg-blue-100 text-blue-800">Direto</Badge>}
                      {outdated && (
                        <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Desatualizada
                        </Badge>
                      )}
                      {quote.deviations?.length ? (
                        <Badge className="bg-amber-100 text-amber-800" >
                          Diverge da solicitação
                        </Badge>
                      ) : null}
                      <Badge className="bg-gray-100 text-gray-700">
                        {PRICE_SOURCE_LABELS[quote.priceSource]}
                      </Badge>
                    </div>

                    {/* Rota e horários */}
                    <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                      <span>{quote.origin}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span>{quote.destination}</span>
                      <span className="text-gray-400">·</span>
                      <span>{quote.stops === 0 ? 'Direto' : `${quote.stops} escala${quote.stops > 1 ? 's' : ''}`}</span>
                      <span className="text-gray-400">·</span>
                      <span>{formatDuration(quote.durationMinutes)}</span>
                    </div>

                    {/* Horários */}
                    <p className="text-xs text-gray-500 mb-1">
                      Partida: {formatDateTime(quote.departureDateTime)}
                      {quote.arrivalDateTime && <>{' → '}Chegada: {formatDateTime(quote.arrivalDateTime)}</>}
                    </p>

                    {/* Bagagem e fonte */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Luggage className="w-3 h-3" />
                        {BAGGAGE_LABELS[quote.baggageIncluded]}
                      </span>
                      <span>Fonte: {quote.source}</span>
                      <span>Consultado: {formatDateTime(quote.consultedAt)}</span>
                      {req && (
                        <span className="text-blue-600">
                          {req.clientName}: {req.origin} → {req.destination}
                        </span>
                      )}
                    </div>

                    {/* Aviso bagagem incompatível */}
                    {hasIncompatibleBaggage && (
                      <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Atenção: cotações desta lista têm condições de bagagem diferentes — compare com cuidado.
                      </p>
                    )}
                  </div>

                  {/* Preço e ações */}
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${isLowest ? 'text-green-700' : 'text-gray-900'}`}>
                      {formatCurrency(quote.totalPrice, quote.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {quote.passengers} pax · Base: {formatCurrency(quote.basePrice, quote.currency)}
                    </p>
                    {quote.taxes > 0 && (
                      <p className="text-xs text-gray-400">
                        + taxas: {formatCurrency(quote.taxes, quote.currency)}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2 justify-end">
                      {quote.offerLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(quote.offerLink, '_blank')}
                          title="Abrir oferta"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditQuote(quote); setShowForm(true); }}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(quote.id!)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <QuoteForm
          quote={editQuote}
          requests={requests}
          onSaved={() => { setShowForm(false); setEditQuote(null); load(); }}
          onClose={() => { setShowForm(false); setEditQuote(null); }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir cotação"
        message="Esta cotação será removida permanentemente."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
