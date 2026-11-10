// ============================================================
// AeroMonitor AI — Registrar novo preço em um monitoramento (Estratégia A)
// ============================================================
import { useState } from 'react';
import { monitoringDB, alertsDB, db } from '../db';
import type { FlightRequest, MonitoringEntry } from '../types';
import { recordPrice, validatePrice } from '../monitoring/logic';
import { Modal, Field, Input, Button } from '../components/ui';

interface Props {
  entry: MonitoringEntry;
  request: FlightRequest;
  onSaved: () => void;
  onClose: () => void;
}

export default function PriceRecordForm({ entry, request, onSaved, onClose }: Props) {
  const [price, setPrice] = useState('');
  const [source, setSource] = useState('Google Flights');
  const [airline, setAirline] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    const err = validatePrice(value);
    if (err) return setError(err);
    if (!source.trim()) return setError('Informe a fonte da consulta');
    setSaving(true);
    try {
      const { entry: updated, alerts } = recordPrice(entry, { price: value, source, airline });
      await db.transaction('rw', [db.monitoring, db.alerts], async () => {
        await monitoringDB.update(entry.id!, updated);
        const existing = await alertsDB.getAll();
        for (const a of alerts) {
          // Deduplicação: mesmo tipo + mesma mensagem para a mesma solicitação
          const dup = existing.some(
            (x) => x.requestId === entry.requestId && x.type === a.type && x.message === a.message
          );
          if (dup) continue;
          await alertsDB.create({
            requestId: entry.requestId,
            clientName: request.clientName || 'Cliente',
            type: a.type,
            message: a.message,
            isRead: false,
            isDismissed: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
      onSaved();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Registrar preço consultado" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          {request.origin} → {request.destination}. Informe apenas preços realmente encontrados.
        </p>
        <Field label={`Preço total (${entry.currency})`} required error={error}>
          <Input type="number" min="0" step="0.01" value={price} autoFocus
            onChange={(e) => { setPrice(e.target.value); setError(''); }} placeholder="Ex: 790" />
        </Field>
        <Field label="Fonte" required>
          <Input value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field label="Companhia (opcional)">
          <Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="LATAM, GOL, Azul..." />
        </Field>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}
