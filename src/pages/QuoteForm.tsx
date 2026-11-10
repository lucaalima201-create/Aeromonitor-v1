// ============================================================
// AeroMonitor AI — Formulário de Cotação (Modal)
// Vinculado a uma solicitação: pré-preenche rota, datas e passageiros,
// mas NUNCA horários, companhia, escalas, preços ou bagagem da oferta.
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { quotesDB } from '../db';
import type { QuoteEntry, FlightRequest, BaggageOption, PriceSource } from '../types';
import { BAGGAGE_LABELS, PRICE_SOURCE_LABELS } from '../types';
import { Modal, Field, Input, Select, Textarea, Button, AlertBanner } from '../components/ui';
import AirportSelect from '../components/AirportSelect';
import { compareQuoteToRequest, hasBlocking } from '../quotes/logic';
import { formatLocation } from '../data/airportSearch';
import { formatDate, formatCurrency } from '../utils';

interface Props {
  quote: QuoteEntry | null;
  requests: FlightRequest[];
  /** Solicitação pré-selecionada (ex.: botão "Criar cotação"). */
  initialRequestId?: number;
  onSaved: () => void;
  onClose: () => void;
}

const AIRLINES = [
  'LATAM', 'GOL', 'Azul', 'Avianca', 'American Airlines',
  'TAP', 'Air France', 'Emirates', 'Copa Airlines', 'Outra',
];

const SOURCES = [
  'Google Flights', 'Skyscanner', 'Site LATAM', 'Site GOL',
  'Site Azul', 'Ligação/Agência', 'Outro',
];

interface FormData {
  requestId: string;
  airline: string;
  source: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  returnDepartureDate: string;
  returnDepartureTime: string;
  returnArrivalDate: string;
  returnArrivalTime: string;
  stops: string;
  durationMinutes: string;
  basePrice: string;
  taxes: string;
  baggageIncluded: BaggageOption | '';
  currency: string;
  passengers: string;
  offerLink: string;
  priceSource: PriceSource;
  notes: string;
  deviationNote: string;
}

const split = (dt?: string): [string, string] => {
  if (!dt) return ['', ''];
  const [d, t] = dt.split('T');
  return [d ?? '', (t ?? '').slice(0, 5)];
};

const EMPTY = (requestId = ''): FormData => ({
  requestId, airline: '', source: 'Google Flights',
  origin: '', originCode: '', destination: '', destinationCode: '',
  departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '',
  returnDepartureDate: '', returnDepartureTime: '', returnArrivalDate: '', returnArrivalTime: '',
  stops: '0', durationMinutes: '', basePrice: '', taxes: '0',
  baggageIncluded: '', currency: 'BRL', passengers: '1', offerLink: '',
  priceSource: 'manual', notes: '', deviationNote: '',
});

export default function QuoteForm({ quote, requests, initialRequestId, onSaved, onClose }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY(initialRequestId ? String(initialRequestId) : ''));
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Edição: carrega a cotação existente.
  useEffect(() => {
    if (!quote) return;
    const [dd, dt] = split(quote.departureDateTime);
    const [ad, at] = split(quote.arrivalDateTime);
    const [rdd, rdt] = split(quote.returnDepartureDateTime);
    const [rad, rat] = split(quote.returnArrivalDateTime);
    setForm({
      requestId: String(quote.requestId),
      airline: quote.airline, source: quote.source,
      origin: quote.origin, originCode: quote.originCode ?? '',
      destination: quote.destination, destinationCode: quote.destinationCode ?? '',
      departureDate: dd, departureTime: dt, arrivalDate: ad, arrivalTime: at,
      returnDepartureDate: rdd, returnDepartureTime: rdt, returnArrivalDate: rad, returnArrivalTime: rat,
      stops: String(quote.stops), durationMinutes: String(quote.durationMinutes),
      basePrice: String(quote.basePrice), taxes: String(quote.taxes),
      baggageIncluded: quote.baggageIncluded, currency: quote.currency,
      passengers: String(quote.passengers), offerLink: quote.offerLink ?? '',
      priceSource: quote.priceSource, notes: quote.notes ?? '',
      deviationNote: quote.deviationNote ?? '',
    });
  }, [quote]);

  const request = useMemo(
    () => requests.find((r) => String(r.id) === form.requestId),
    [requests, form.requestId]
  );

  // Nova cotação: ao escolher a solicitação, copia APENAS dados da solicitação.
  useEffect(() => {
    if (quote || !request) return;
    setForm((prev) => ({
      ...prev,
      origin: request.origin,
      originCode: request.originCode ?? '',
      destination: request.destination,
      destinationCode: request.destinationCode ?? '',
      departureDate: request.departureDate,
      returnDepartureDate: request.returnDate ?? '',
      passengers: String(request.adults + request.children + request.infants),
      currency: request.currency,
    }));
    setErrors({});
  }, [request?.id]);

  const setField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const totalPrice = (() => {
    const base = parseFloat(form.basePrice) || 0;
    const taxes = parseFloat(form.taxes) || 0;
    const pax = parseInt(form.passengers) || 1;
    return (base + taxes) * pax;
  })();

  const deviations = useMemo(() => {
    if (!request) return [];
    return compareQuoteToRequest({
      origin: form.origin, destination: form.destination,
      originCode: form.originCode || undefined, destinationCode: form.destinationCode || undefined,
      departureDate: form.departureDate,
      returnDate: form.returnDepartureDate || undefined,
      passengers: parseInt(form.passengers) || 0,
      baggageIncluded: form.baggageIncluded || undefined,
    }, request);
  }, [request, form.origin, form.destination, form.originCode, form.destinationCode,
      form.departureDate, form.returnDepartureDate, form.passengers, form.baggageIncluded]);

  const needsJustification = hasBlocking(deviations);

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.requestId) e.requestId = 'Selecione a solicitação';
    if (!form.airline.trim()) e.airline = 'Companhia aérea é obrigatória';
    if (!form.origin.trim()) e.origin = 'Origem é obrigatória';
    if (!form.destination.trim()) e.destination = 'Destino é obrigatório';
    if (!form.departureDate) e.departureDate = 'Data de partida é obrigatória';
    if (!form.departureTime) e.departureTime = 'Informe o horário real da oferta';
    if (form.returnDepartureDate && !form.returnDepartureTime) e.returnDepartureTime = 'Informe o horário da volta';
    if (form.returnDepartureTime && !form.returnDepartureDate) e.returnDepartureDate = 'Informe a data da volta';
    const base = parseFloat(form.basePrice);
    if (!form.basePrice || isNaN(base) || base <= 0) e.basePrice = 'Preço base deve ser maior que zero';
    if (parseFloat(form.taxes) < 0) e.taxes = 'Taxas não podem ser negativas';
    if (!form.durationMinutes || isNaN(parseInt(form.durationMinutes)) || parseInt(form.durationMinutes) <= 0) {
      e.durationMinutes = 'Duração é obrigatória';
    }
    const pax = parseInt(form.passengers);
    if (!pax || pax < 1) e.passengers = 'Mínimo 1 passageiro';
    if (!form.baggageIncluded) e.baggageIncluded = 'Informe a bagagem incluída conforme a oferta';
    if (needsJustification && form.deviationNote.trim().length < 5) {
      e.deviationNote = 'Justifique a diferença em relação à solicitação (mín. 5 caracteres)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaveError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const join = (d: string, t: string) => (d && t ? `${d}T${t}` : undefined);
      const data: Omit<QuoteEntry, 'id'> = {
        requestId: Number(form.requestId),
        airline: form.airline.trim(),
        source: form.source,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        originCode: form.originCode || undefined,
        destinationCode: form.destinationCode || undefined,
        departureDateTime: join(form.departureDate, form.departureTime)!,
        // Chegada não é mais solicitada; valores já gravados são preservados ao editar.
        arrivalDateTime: join(form.arrivalDate, form.arrivalTime),
        returnDepartureDateTime: join(form.returnDepartureDate, form.returnDepartureTime),
        returnArrivalDateTime: join(form.returnArrivalDate, form.returnArrivalTime),
        stops: parseInt(form.stops),
        durationMinutes: parseInt(form.durationMinutes),
        basePrice: parseFloat(form.basePrice),
        taxes: parseFloat(form.taxes) || 0,
        baggageIncluded: form.baggageIncluded as BaggageOption,
        currency: form.currency,
        passengers: parseInt(form.passengers),
        totalPrice,
        offerLink: form.offerLink || undefined,
        priceSource: form.priceSource,
        consultedAt: quote?.consultedAt || now,
        isOutdated: false,
        notes: form.notes || undefined,
        // Só rota/datas/passageiros contam como divergência registrada; bagagem menor já aparece na comparação.
        deviations: needsJustification ? deviations.filter((d) => d.blocking).map((d) => d.message) : undefined,
        deviationNote: needsJustification ? form.deviationNote.trim() : undefined,
      };
      if (quote?.id) {
        await quotesDB.update(quote.id, data);
      } else {
        await quotesDB.create(data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      setSaveError('Não foi possível salvar a cotação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const reqOptions = [
    { value: '', label: 'Selecione a solicitação...' },
    ...requests.map((r) => ({
      value: String(r.id),
      label: `${r.clientName} — ${formatLocation(r.origin, r.originCode)} → ${formatLocation(r.destination, r.destinationCode)} (${formatDate(r.departureDate)})`,
    })),
  ];
  const baggageOptions = [
    { value: '', label: 'Selecione conforme a oferta...' },
    ...Object.entries(BAGGAGE_LABELS).map(([v, l]) => ({ value: v, label: l })),
  ];
  const sourceOptions = Object.entries(PRICE_SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }));
  const lockedRequest = !!initialRequestId && !quote;

  return (
    <Modal open onClose={onClose} title={quote ? 'Editar Cotação' : 'Registrar Cotação'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <AlertBanner type="info">
          Registre apenas tarifas que você encontrou realmente nas companhias ou comparadores.
          Rota, datas e passageiros vêm da solicitação; horários, companhia, escalas, bagagem e preços
          devem ser informados a partir da oferta consultada.
        </AlertBanner>

        {/* Solicitação */}
        <Field label="Solicitação do Cliente" required error={errors.requestId}>
          <Select
            value={form.requestId}
            onChange={(e) => setField('requestId', e.target.value)}
            options={reqOptions}
            error={!!errors.requestId}
            disabled={lockedRequest}
          />
        </Field>

        {request && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 space-y-0.5">
            <p className="font-medium flex items-center gap-1"><Info className="w-4 h-4" /> Solicitação #{request.id} — {request.clientName}</p>
            <p>{formatLocation(request.origin, request.originCode)} → {formatLocation(request.destination, request.destinationCode)}</p>
            <p>
              Ida {formatDate(request.departureDate)}
              {request.returnDate ? ` · Volta ${formatDate(request.returnDate)}` : ' · Somente ida'}
              {request.flexibleDates ? ' · datas flexíveis' : ''}
            </p>
            <p>
              {request.adults} adulto(s){request.children ? `, ${request.children} criança(s)` : ''}{request.infants ? `, ${request.infants} bebê(s)` : ''}
              {' · '}Bagagem desejada: {BAGGAGE_LABELS[request.baggagePreference]}
              {request.directFlightPreference ? ' · prefere voo direto' : ''}
              {request.targetPrice ? ` · preço máximo ${formatCurrency(request.targetPrice, request.currency)}` : ''}
            </p>
          </div>
        )}

        {/* Companhia e Fonte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Companhia Aérea" required error={errors.airline}>
            <Input
              list="airlines-list"
              value={form.airline}
              onChange={(e) => setField('airline', e.target.value)}
              placeholder="LATAM, GOL, Azul..."
              error={!!errors.airline}
            />
            <datalist id="airlines-list">
              {AIRLINES.map((a) => <option key={a} value={a} />)}
            </datalist>
          </Field>
          <Field label="Fonte da Pesquisa">
            <Input
              list="sources-list"
              value={form.source}
              onChange={(e) => setField('source', e.target.value)}
              placeholder="Google Flights, Skyscanner..."
            />
            <datalist id="sources-list">
              {SOURCES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
        </div>

        {/* Rota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origem da oferta" required error={errors.origin}>
            <AirportSelect
              value={{ city: form.origin, code: form.originCode || undefined }}
              onChange={(v) => {
                setForm((p) => ({ ...p, origin: v.city, originCode: v.code ?? '' }));
                setErrors((p) => ({ ...p, origin: undefined }));
              }}
              error={!!errors.origin}
            />
          </Field>
          <Field label="Destino da oferta" required error={errors.destination}>
            <AirportSelect
              value={{ city: form.destination, code: form.destinationCode || undefined }}
              onChange={(v) => {
                setForm((p) => ({ ...p, destination: v.city, destinationCode: v.code ?? '' }));
                setErrors((p) => ({ ...p, destination: undefined }));
              }}
              error={!!errors.destination}
            />
          </Field>
        </div>

        {/* Voo de ida */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Voo de ida</p>
          <div className="grid grid-cols-2 gap-4 sm:max-w-lg">
            <Field label="Data de partida" required error={errors.departureDate}>
              <Input type="date" value={form.departureDate}
                onChange={(e) => setField('departureDate', e.target.value)} error={!!errors.departureDate} />
            </Field>
            <Field label="Horário de partida" required error={errors.departureTime}>
              <Input type="time" value={form.departureTime}
                onChange={(e) => setField('departureTime', e.target.value)} error={!!errors.departureTime} />
            </Field>
          </div>
        </div>

        {/* Voo de volta */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Voo de volta (se aplicável)</p>
          <div className="grid grid-cols-2 gap-4 sm:max-w-lg">
            <Field label="Data de partida" error={errors.returnDepartureDate}>
              <Input type="date" value={form.returnDepartureDate}
                onChange={(e) => setField('returnDepartureDate', e.target.value)} error={!!errors.returnDepartureDate} />
            </Field>
            <Field label="Horário de partida" error={errors.returnDepartureTime}>
              <Input type="time" value={form.returnDepartureTime}
                onChange={(e) => setField('returnDepartureTime', e.target.value)} error={!!errors.returnDepartureTime} />
            </Field>
          </div>
        </div>

        {/* Escalas e duração */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Escalas">
            <Select
              value={form.stops}
              onChange={(e) => setField('stops', e.target.value)}
              options={[
                { value: '0', label: 'Direto' },
                { value: '1', label: '1 escala' },
                { value: '2', label: '2 escalas' },
                { value: '3', label: '3+ escalas' },
              ]}
            />
          </Field>
          <Field label="Duração total (min)" required error={errors.durationMinutes}>
            <Input
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setField('durationMinutes', e.target.value)}
              placeholder="Ex: 180"
              error={!!errors.durationMinutes}
              min="1"
            />
          </Field>
          <Field label="Passageiros" error={errors.passengers}>
            <Input
              type="number"
              value={form.passengers}
              onChange={(e) => setField('passengers', e.target.value)}
              min="1"
              max="9"
              error={!!errors.passengers}
            />
          </Field>
        </div>

        {/* Preços */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Moeda">
            <Select
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value)}
              options={[
                { value: 'BRL', label: 'BRL (R$)' },
                { value: 'USD', label: 'USD (US$)' },
                { value: 'EUR', label: 'EUR (€)' },
              ]}
            />
          </Field>
          <Field label="Preço base (por pax)" required error={errors.basePrice}>
            <Input
              type="number"
              value={form.basePrice}
              onChange={(e) => setField('basePrice', e.target.value)}
              placeholder="Ex: 650.00"
              error={!!errors.basePrice}
              min="0"
              step="0.01"
            />
          </Field>
          <Field label="Taxas (por pax)" error={errors.taxes}>
            <Input
              type="number"
              value={form.taxes}
              onChange={(e) => setField('taxes', e.target.value)}
              placeholder="Ex: 50.00"
              min="0"
              step="0.01"
              error={!!errors.taxes}
            />
          </Field>
        </div>

        {/* Total calculado */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Valor total calculado:</strong>{' '}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: form.currency }).format(totalPrice)}
            {' '}({form.passengers} passageiro{parseInt(form.passengers) !== 1 ? 's' : ''})
          </p>
        </div>

        {/* Bagagem e origem do preço */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bagagem incluída na oferta" required error={errors.baggageIncluded}
            hint={request ? `O cliente deseja: ${BAGGAGE_LABELS[request.baggagePreference]}` : undefined}>
            <Select
              value={form.baggageIncluded}
              onChange={(e) => setField('baggageIncluded', e.target.value)}
              options={baggageOptions}
              error={!!errors.baggageIncluded}
            />
          </Field>
          <Field label="Origem do Preço">
            <Select
              value={form.priceSource}
              onChange={(e) => setField('priceSource', e.target.value)}
              options={sourceOptions}
            />
          </Field>
        </div>

        {/* Divergências com a solicitação */}
        {deviations.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2" role="alert">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Esta oferta difere da solicitação original
            </p>
            <ul className="list-disc pl-5 text-sm text-amber-900 space-y-0.5">
              {deviations.map((d, i) => <li key={i}>{d.message}</li>)}
            </ul>
            <p className="text-xs text-amber-800">
              Os dados da solicitação não foram alterados. A cotação ficará marcada como divergente
              e não entrará na comparação de ofertas equivalentes.
            </p>
            {needsJustification && (
              <Field label="Justificativa da diferença" required error={errors.deviationNote}>
                <Textarea
                  value={form.deviationNote}
                  onChange={(e) => setField('deviationNote', e.target.value)}
                  placeholder="Ex.: cliente aceitou sair um dia depois; oferta de 1 passageiro por falta de assentos..."
                  rows={2}
                  error={!!errors.deviationNote}
                />
              </Field>
            )}
          </div>
        )}

        {/* Link da oferta */}
        <Field label="Link da oferta (opcional)">
          <Input
            type="url"
            value={form.offerLink}
            onChange={(e) => setField('offerLink', e.target.value)}
            placeholder="https://..."
          />
        </Field>

        {/* Observações */}
        <Field label="Observações">
          <Input
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Condições especiais, validade da tarifa..."
          />
        </Field>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex gap-3 pt-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>
            {quote ? 'Salvar Alterações' : 'Registrar Cotação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
