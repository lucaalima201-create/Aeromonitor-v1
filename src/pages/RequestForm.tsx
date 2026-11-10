// ============================================================
// AeroMonitor AI — Formulário de Solicitação (Modal)
// ============================================================
import { useState, useEffect } from 'react';
import { requestsDB } from '../db';
import type { Client, FlightRequest, RequestStatus, BaggageOption, TripType } from '../types';
import {
  REQUEST_STATUS_LABELS, BAGGAGE_LABELS,
} from '../types';
import {
  Modal, Field, Input, Select, Textarea, Button
} from '../components/ui';
import AirportSelect from '../components/AirportSelect';
import MoneyInput from '../components/MoneyInput';
import { parseMoney, formatMoneyInput } from '../utils/money';

interface Props {
  request: FlightRequest | null;
  clients: Client[];
  defaultClientId?: number;
  onSaved: () => void;
  onClose: () => void;
}

interface FormData {
  clientId: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  tripType: TripType;
  departureDate: string;
  returnDate: string;
  adults: string;
  children: string;
  infants: string;
  baggagePreference: BaggageOption;
  directFlightPreference: boolean;
  flexibleDates: boolean;
  targetPrice: string;
  currency: string;
  status: RequestStatus;
  notes: string;
}

const INITIAL = (clientId?: number): FormData => ({
  clientId: clientId ? String(clientId) : '',
  origin: '',
  originCode: '',
  destination: '',
  destinationCode: '',
  tripType: 'round_trip',
  departureDate: '',
  returnDate: '',
  adults: '1',
  children: '0',
  infants: '0',
  baggagePreference: 'carry_on',
  directFlightPreference: false,
  flexibleDates: false,
  targetPrice: '',
  currency: 'BRL',
  status: 'new',
  notes: '',
});

export default function RequestForm({ request, clients, defaultClientId, onSaved, onClose }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL(defaultClientId));
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setForm({
        clientId: String(request.clientId),
        origin: request.origin,
        originCode: request.originCode || '',
        destination: request.destination,
        destinationCode: request.destinationCode || '',
        tripType: request.tripType,
        departureDate: request.departureDate,
        returnDate: request.returnDate || '',
        adults: String(request.adults),
        children: String(request.children),
        infants: String(request.infants),
        baggagePreference: request.baggagePreference,
        directFlightPreference: request.directFlightPreference,
        flexibleDates: request.flexibleDates,
        targetPrice: request.targetPrice ? formatMoneyInput(request.targetPrice) : '',
        currency: request.currency,
        status: request.status,
        notes: request.notes || '',
      });
    } else {
      setForm(INITIAL(defaultClientId));
    }
    setErrors({});
  }, [request]);

  const setField = (key: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.clientId) e.clientId = 'Selecione um cliente';
    if (!form.origin.trim()) e.origin = 'Origem é obrigatória';
    else if (!form.originCode) e.origin = 'Selecione um aeroporto na lista (código IATA)';
    if (!form.destination.trim()) e.destination = 'Destino é obrigatório';
    else if (!form.destinationCode) e.destination = 'Selecione um aeroporto na lista (código IATA)';
    if (form.originCode && form.originCode === form.destinationCode) {
      e.destination = 'Origem e destino não podem ser iguais';
    }
    if (!form.departureDate) e.departureDate = 'Data de ida é obrigatória';
    if (form.tripType === 'round_trip' && !form.returnDate) {
      e.returnDate = 'Data de volta é obrigatória para ida e volta';
    }
    if (form.returnDate && form.returnDate <= form.departureDate) {
      e.returnDate = 'Data de volta deve ser após a data de ida';
    }
    if (Number(form.adults) < 1) e.adults = 'Mínimo 1 adulto';
    if (form.targetPrice.trim()) {
      const v = parseMoney(form.targetPrice);
      if (v === null) e.targetPrice = 'Valor inválido. Exemplos: 800 ou 1.250,50';
      else if (v <= 0) e.targetPrice = 'O valor deve ser maior que zero';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const client = clients.find((c) => String(c.id) === form.clientId);
      const data: Omit<FlightRequest, 'id'> = {
        clientId: Number(form.clientId),
        clientName: client?.name,
        origin: form.origin.trim(),
        originCode: form.originCode.trim().toUpperCase() || undefined,
        destination: form.destination.trim(),
        destinationCode: form.destinationCode.trim().toUpperCase() || undefined,
        tripType: form.tripType,
        departureDate: form.departureDate,
        returnDate: form.returnDate || undefined,
        adults: Number(form.adults),
        children: Number(form.children),
        infants: Number(form.infants),
        baggagePreference: form.baggagePreference,
        directFlightPreference: form.directFlightPreference,
        flexibleDates: form.flexibleDates,
        targetPrice: form.targetPrice.trim() ? (parseMoney(form.targetPrice) ?? undefined) : undefined,
        currency: form.currency,
        status: form.status,
        notes: form.notes.trim() || undefined,
        createdAt: request?.createdAt || now,
        updatedAt: now,
      };
      if (request?.id) {
        await requestsDB.update(request.id, data);
      } else {
        await requestsDB.create(data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = [
    { value: '', label: 'Selecione um cliente...' },
    ...clients.map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const statusOptions = Object.entries(REQUEST_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));
  const baggageOptions = Object.entries(BAGGAGE_LABELS).map(([v, l]) => ({ value: v, label: l }));
  const tripTypeOptions = [
    { value: 'round_trip', label: 'Ida e Volta' },
    { value: 'one_way', label: 'Somente Ida' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={request ? 'Editar Solicitação' : 'Nova Solicitação'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente e Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cliente" required error={errors.clientId}>
            <Select
              value={form.clientId}
              onChange={(e) => setField('clientId', e.target.value)}
              options={clientOptions}
              error={!!errors.clientId}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
              options={statusOptions}
            />
          </Field>
        </div>

        {/* Rota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origem" required error={errors.origin}>
            <AirportSelect
              value={{ city: form.origin, code: form.originCode || undefined }}
              onChange={(v) => {
                setForm((prev) => ({ ...prev, origin: v.city, originCode: v.code ?? '' }));
                setErrors((prev) => ({ ...prev, origin: undefined }));
              }}
              placeholder="Cidade, aeroporto ou código (ex.: Aracaju)"
              error={!!errors.origin}
            />
          </Field>
          <Field label="Destino" required error={errors.destination}>
            <AirportSelect
              value={{ city: form.destination, code: form.destinationCode || undefined }}
              onChange={(v) => {
                setForm((prev) => ({ ...prev, destination: v.city, destinationCode: v.code ?? '' }));
                setErrors((prev) => ({ ...prev, destination: undefined }));
              }}
              placeholder="Cidade, aeroporto ou código (ex.: GRU)"
              error={!!errors.destination}
            />
          </Field>
        </div>

        {/* Tipo e Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Tipo de Viagem">
            <Select
              value={form.tripType}
              onChange={(e) => setField('tripType', e.target.value)}
              options={tripTypeOptions}
            />
          </Field>
          <Field label="Data de Ida" required error={errors.departureDate}>
            <Input
              type="date"
              value={form.departureDate}
              onChange={(e) => setField('departureDate', e.target.value)}
              error={!!errors.departureDate}
              min={new Date().toISOString().split('T')[0]}
            />
          </Field>
          {form.tripType === 'round_trip' && (
            <Field label="Data de Volta" required error={errors.returnDate}>
              <Input
                type="date"
                value={form.returnDate}
                onChange={(e) => setField('returnDate', e.target.value)}
                error={!!errors.returnDate}
                min={form.departureDate || new Date().toISOString().split('T')[0]}
              />
            </Field>
          )}
        </div>

        {/* Passageiros */}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Adultos" required error={errors.adults}>
            <Input
              type="number"
              value={form.adults}
              onChange={(e) => setField('adults', e.target.value)}
              min="1"
              max="9"
              error={!!errors.adults}
            />
          </Field>
          <Field label="Crianças" hint="2–11 anos">
            <Input
              type="number"
              value={form.children}
              onChange={(e) => setField('children', e.target.value)}
              min="0"
              max="8"
            />
          </Field>
          <Field label="Bebês" hint="Até 2 anos">
            <Input
              type="number"
              value={form.infants}
              onChange={(e) => setField('infants', e.target.value)}
              min="0"
              max="4"
            />
          </Field>
        </div>

        {/* Preferências */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bagagem Desejada">
            <Select
              value={form.baggagePreference}
              onChange={(e) => setField('baggagePreference', e.target.value)}
              options={baggageOptions}
            />
          </Field>
          <Field label="Preço Máximo Desejado (opcional)" error={errors.targetPrice} hint="Ex.: 800 ou 1.250,50">
            <MoneyInput
              value={form.targetPrice}
              onChange={(v) => setField('targetPrice', v)}
              currency={form.currency}
              error={!!errors.targetPrice}
            />
          </Field>
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.directFlightPreference}
              onChange={(e) => setField('directFlightPreference', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Prefere voo direto</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.flexibleDates}
              onChange={(e) => setField('flexibleDates', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm text-gray-700">Datas flexíveis</span>
          </label>
        </div>

        {/* Observações */}
        <Field label="Observações">
          <Textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Horários preferenciais, conexão aceitável, companhia preferida..."
            rows={3}
          />
        </Field>

        <div className="flex gap-3 pt-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>
            {request ? 'Salvar Alterações' : 'Criar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
