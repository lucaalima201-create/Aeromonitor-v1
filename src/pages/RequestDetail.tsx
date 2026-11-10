// ============================================================
// AeroMonitor AI — Detalhe da Solicitação + cotações vinculadas
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Award, AlertTriangle, Luggage, ArrowRight } from 'lucide-react';
import { requestsDB, clientsDB, quotesDB } from '../db';
import type { FlightRequest, QuoteEntry } from '../types';
import {
  BAGGAGE_LABELS, REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS, PRICE_SOURCE_LABELS,
} from '../types';
import { Badge, Button, Card, ConfirmDialog, EmptyState } from '../components/ui';
import { formatCurrency, formatDate, formatDateTime, formatDuration } from '../utils';
import { formatLocation } from '../data/airportSearch';
import { findBestComparable } from '../quotes/logic';
import QuoteForm from './QuoteForm';
import RequestForm from './RequestForm';
import type { Client } from '../types';

export default function RequestDetail() {
  const { id } = useParams();
  const requestId = Number(id);
  const [params, setParams] = useSearchParams();
  const [request, setRequest] = useState<FlightRequest | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editQuote, setEditQuote] = useState<QuoteEntry | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(requestId)) { setNotFound(true); setLoading(false); return; }
    const [req, cls, qs] = await Promise.all([
      requestsDB.getById(requestId),
      clientsDB.getAll(),
      quotesDB.getByRequestId(requestId),
    ]);
    if (!req) { setNotFound(true); setLoading(false); return; }
    const client = cls.find((c) => c.id === req.clientId);
    setRequest({ ...req, clientName: client?.name ?? 'Desconhecido' });
    setClients(cls);
    setQuotes(qs);
    setLoading(false);
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  // Atalho vindo da lista: /solicitacoes/:id?criarCotacao=1
  useEffect(() => {
    if (request && params.get('criarCotacao') === '1') {
      setEditQuote(null);
      setShowQuoteForm(true);
      params.delete('criarCotacao');
      setParams(params, { replace: true });
    }
  }, [request, params, setParams]);

  if (loading) return <div className="p-6 text-gray-400">Carregando...</div>;
  if (notFound || !request) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState title="Solicitação não encontrada" description="Ela pode ter sido excluída."
          action={<Link to="/solicitacoes"><Button>Voltar às solicitações</Button></Link>} />
      </div>
    );
  }

  const best = findBestComparable(quotes, request);
  const pax = request.adults + request.children + request.infants;

  const handleDelete = async () => {
    if (deleteId == null) return;
    await quotesDB.delete(deleteId);
    setDeleteId(null);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link to="/solicitacoes" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Solicitações
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Solicitação #{request.id} — {request.clientName}
          </h1>
          <div className="mt-1"><Badge className={REQUEST_STATUS_COLORS[request.status]}>{REQUEST_STATUS_LABELS[request.status]}</Badge></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEdit(true)}><Edit2 className="w-4 h-4" /> Editar</Button>
          <Button onClick={() => { setEditQuote(null); setShowQuoteForm(true); }}>
            <Plus className="w-4 h-4" /> Criar cotação
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <p className="font-semibold text-gray-900">
          {formatLocation(request.origin, request.originCode)} → {formatLocation(request.destination, request.destinationCode)}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
          <span>Ida: {formatDate(request.departureDate)}</span>
          <span>{request.returnDate ? `Volta: ${formatDate(request.returnDate)}` : 'Somente ida'}</span>
          <span>{pax} passageiro(s): {request.adults} adulto(s), {request.children} criança(s), {request.infants} bebê(s)</span>
          <span>Bagagem desejada: {BAGGAGE_LABELS[request.baggagePreference]}</span>
          <span>Voo direto: {request.directFlightPreference ? 'preferência do cliente' : 'indiferente'}</span>
          <span>Datas flexíveis: {request.flexibleDates ? 'sim' : 'não'}</span>
          <span>Preço máximo: {request.targetPrice ? formatCurrency(request.targetPrice, request.currency) : 'não informado'}</span>
        </div>
        {request.notes && <p className="mt-2 text-sm text-gray-500">{request.notes}</p>}
      </Card>

      {/* Melhor oferta comparável */}
      {quotes.length > 0 && (
        <Card className={`mb-4 ${best.best ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
          <p className="font-semibold flex items-center gap-2 text-gray-900">
            <Award className="w-4 h-4" /> Melhor oferta comparável
          </p>
          {best.best ? (
            <p className="text-sm mt-1 text-gray-800">
              <strong>{best.best.airline}</strong> ({best.best.source}) — {formatCurrency(best.best.totalPrice, best.best.currency)}
              {' · '}{best.best.stops === 0 ? 'direto' : `${best.best.stops} escala(s)`}
              {' · '}{BAGGAGE_LABELS[best.best.baggageIncluded]}
            </p>
          ) : (
            <p className="text-sm mt-1 text-amber-900">{best.note ?? 'Nenhuma cotação é comparável.'}</p>
          )}
          {best.note && best.best && <p className="text-xs mt-1 text-gray-600">{best.note}</p>}
          <p className="text-xs mt-2 text-gray-500">
            Comparável = mesma rota, datas e passageiros da solicitação, bagagem igual ou maior que a desejada,
            mesma moeda e consulta com menos de 24h. Ofertas fora desse critério continuam listadas abaixo, com o motivo.
          </p>
        </Card>
      )}

      <h2 className="font-semibold text-gray-900 mb-2">Cotações vinculadas ({quotes.length})</h2>
      {quotes.length === 0 ? (
        <EmptyState
          title="Nenhuma cotação para esta solicitação"
          description="Clique em “Criar cotação” e informe a oferta que você encontrou. Você pode cadastrar várias para comparar companhias."
          action={<Button onClick={() => setShowQuoteForm(true)}><Plus className="w-4 h-4" /> Criar cotação</Button>}
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const isBest = best.best?.id === q.id;
            const reasons = best.excluded[q.id ?? -1];
            return (
              <Card key={q.id} className={isBest ? 'border-green-300' : ''}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{q.airline}</span>
                      {isBest && <Badge className="bg-green-100 text-green-800">✓ Melhor comparável</Badge>}
                      {q.stops === 0 && <Badge className="bg-blue-100 text-blue-800">Direto</Badge>}
                      {q.deviations?.length ? <Badge className="bg-amber-100 text-amber-800">Diverge da solicitação</Badge> : null}
                      <Badge className="bg-gray-100 text-gray-700">{PRICE_SOURCE_LABELS[q.priceSource]}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 flex flex-wrap items-center gap-1">
                      {formatLocation(q.origin, q.originCode)} <ArrowRight className="w-3.5 h-3.5 text-gray-400" /> {formatLocation(q.destination, q.destinationCode)}
                      <span className="text-gray-400">·</span>{q.stops === 0 ? 'Direto' : `${q.stops} escala(s)`}
                      <span className="text-gray-400">·</span>{formatDuration(q.durationMinutes)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ida: {formatDateTime(q.departureDateTime)}{q.arrivalDateTime ? ` → ${formatDateTime(q.arrivalDateTime)}` : ''}
                      {q.returnDepartureDateTime && <> · Volta: {formatDateTime(q.returnDepartureDateTime)}{q.returnArrivalDateTime ? ` → ${formatDateTime(q.returnArrivalDateTime)}` : ''}</>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                      <span className="inline-flex items-center gap-1"><Luggage className="w-3 h-3" />{BAGGAGE_LABELS[q.baggageIncluded]}</span>
                      <span>{q.passengers} pax</span>
                      <span>Fonte: {q.source}</span>
                      <span>Consultado: {formatDateTime(q.consultedAt)}</span>
                    </p>
                    {reasons && (
                      <p className="mt-1 text-xs text-amber-700 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        Fora da comparação: {reasons.join('; ')}.
                      </p>
                    )}
                    {q.deviations?.length ? (
                      <div className="mt-1 text-xs text-amber-800">
                        <ul className="list-disc pl-4">{q.deviations.map((d, i) => <li key={i}>{d}</li>)}</ul>
                        {q.deviationNote && <p className="mt-0.5"><strong>Justificativa:</strong> {q.deviationNote}</p>}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${isBest ? 'text-green-700' : 'text-gray-900'}`}>{formatCurrency(q.totalPrice, q.currency)}</p>
                    <p className="text-xs text-gray-500">Base {formatCurrency(q.basePrice, q.currency)} + taxas {formatCurrency(q.taxes, q.currency)} por pax</p>
                    <div className="flex gap-1 mt-2 justify-end">
                      <Button variant="ghost" size="sm" title="Editar" onClick={() => { setEditQuote(q); setShowQuoteForm(true); }}>
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Excluir" onClick={() => setDeleteId(q.id!)}>
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

      {showQuoteForm && (
        <QuoteForm
          quote={editQuote}
          requests={[request]}
          initialRequestId={request.id}
          onSaved={() => { setShowQuoteForm(false); setEditQuote(null); load(); }}
          onClose={() => { setShowQuoteForm(false); setEditQuote(null); }}
        />
      )}
      {showEdit && (
        <RequestForm
          request={request}
          clients={clients}
          onSaved={() => { setShowEdit(false); load(); }}
          onClose={() => setShowEdit(false)}
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
