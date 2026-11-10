// ============================================================
// AeroMonitor AI — Formulário de Monitoramento (Modal)
// ============================================================
import { useState } from 'react';
import { monitoringDB, alertsDB } from '../db';
import type { FlightRequest, MonitoringEntry, PriceHistoryPoint } from '../types';
import { Modal, Field, Input, Select, Button, AlertBanner } from '../components/ui';

interface Props {
  requests: FlightRequest[];
  onSaved: () => void;
  onClose: () => void;
}

export default function MonitoringForm({ requests, onSaved, onClose }: Props) {
  const [requestId, setRequestId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [firstPrice, setFirstPrice] = useState('');
  const [firstSource, setFirstSource] = useState('Google Flights');
  const [currency, setCurrency] = useState('BRL');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!requestId) e.requestId = 'Selecione uma solicitação';
    if (!targetPrice || isNaN(Number(targetPrice))) e.targetPrice = 'Preço alvo é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const req = requests.find((r) => String(r.id) === requestId);
      const history: PriceHistoryPoint[] = [];

      if (firstPrice && !isNaN(Number(firstPrice))) {
        history.push({
          price: Number(firstPrice),
          source: firstSource,
          priceSource: 'manual',
          recordedAt: now,
        });
      }

      const mon: Omit<MonitoringEntry, 'id'> = {
        requestId: Number(requestId),
        targetPrice: Number(targetPrice),
        lastKnownPrice: firstPrice ? Number(firstPrice) : undefined,
        lowestPrice: firstPrice ? Number(firstPrice) : undefined,
        highestPrice: firstPrice ? Number(firstPrice) : undefined,
        currency,
        isActive: true,
        priceHistory: history,
        lastCheckedAt: firstPrice ? now : undefined,
        createdAt: now,
        updatedAt: now,
      };

      await monitoringDB.create(mon);

      // Verifica se já está abaixo do alvo
      if (firstPrice && Number(firstPrice) <= Number(targetPrice) && req) {
        await alertsDB.create({
          requestId: Number(requestId),
          clientName: req.clientName || 'Cliente',
          type: 'price_below_target',
          message: `Preço inicial ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(firstPrice))} já está abaixo do alvo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(targetPrice))}!`,
          isRead: false,
          isDismissed: false,
          createdAt: now,
        });
      }

      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const reqOptions = [
    { value: '', label: 'Selecione a solicitação...' },
    ...requests.map((r) => ({
      value: String(r.id),
      label: `${r.clientName} — ${r.origin} → ${r.destination} (${r.departureDate})`,
    })),
  ];

  // Preenche preço alvo da solicitação automaticamente
  const handleReqChange = (id: string) => {
    setRequestId(id);
    const req = requests.find((r) => String(r.id) === id);
    if (req?.targetPrice) setTargetPrice(String(req.targetPrice));
    if (req?.currency) setCurrency(req.currency);
  };

  return (
    <Modal open onClose={onClose} title="Novo Monitoramento de Preço" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AlertBanner type="info">
          O monitoramento registra a evolução dos preços que você inserir manualmente. 
          Atualizações automáticas estão planejadas para uma fase futura.
        </AlertBanner>

        <Field label="Solicitação" required error={errors.requestId}>
          <Select
            value={requestId}
            onChange={(e) => handleReqChange(e.target.value)}
            options={reqOptions}
            error={!!errors.requestId}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Moeda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'BRL', label: 'BRL (R$)' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
            />
          </Field>
          <Field label="Preço Alvo" required error={errors.targetPrice}>
            <Input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Ex: 750"
              error={!!errors.targetPrice}
              min="0"
              step="0.01"
            />
          </Field>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <p className="text-xs font-medium text-gray-700">Preço inicial (opcional — se já consultou)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço encontrado">
              <Input
                type="number"
                value={firstPrice}
                onChange={(e) => setFirstPrice(e.target.value)}
                placeholder="Ex: 890"
                min="0"
                step="0.01"
              />
            </Field>
            <Field label="Fonte">
              <Input
                value={firstSource}
                onChange={(e) => setFirstSource(e.target.value)}
                placeholder="Google Flights"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-3 pt-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Iniciar Monitoramento</Button>
        </div>
      </form>
    </Modal>
  );
}
