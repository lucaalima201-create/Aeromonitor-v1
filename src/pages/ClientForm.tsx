// ============================================================
// AeroMonitor AI — Formulário de Cliente (Modal)
// ============================================================
import { useState, useEffect } from 'react';
import { clientsDB } from '../db';
import type { Client } from '../types';
import { Modal, Field, Input, Textarea, Button, AlertBanner } from '../components/ui';
import { isValidPhone } from '../utils';

interface Props {
  client: Client | null;
  onSaved: () => void;
  onClose: () => void;
}

interface FormData {
  name: string;
  whatsapp: string;
  notes: string;
}

const INITIAL: FormData = { name: '', whatsapp: '', notes: '' };

export default function ClientForm({ client, onSaved, onClose }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({ name: client.name, whatsapp: client.whatsapp, notes: client.notes || '' });
    } else {
      setForm(INITIAL);
    }
    setErrors({});
  }, [client]);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.whatsapp.trim()) errs.whatsapp = 'WhatsApp é obrigatório';
    else if (!isValidPhone(form.whatsapp)) {
      errs.whatsapp = 'Número inválido. Use formato: (11) 91234-5678';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (client?.id) {
        await clientsDB.update(client.id, { ...form, updatedAt: now });
      } else {
        await clientsDB.create({ ...form, createdAt: now, updatedAt: now });
      }
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={client ? 'Editar Cliente' : 'Novo Cliente'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AlertBanner type="info">
          Os dados do cliente ficam armazenados apenas no seu navegador (IndexedDB).
          Não são enviados para nenhum servidor.
        </AlertBanner>

        <Field label="Nome completo" required error={errors.name}>
          <Input
            value={form.name}
            onChange={set('name')}
            placeholder="Ex: Maria Silva"
            error={!!errors.name}
            autoFocus
          />
        </Field>

        <Field
          label="WhatsApp"
          required
          error={errors.whatsapp}
          hint="Com DDD. Ex: (79) 99999-0000 ou +55 79 99999-0000"
        >
          <Input
            value={form.whatsapp}
            onChange={set('whatsapp')}
            placeholder="(79) 99999-0000"
            error={!!errors.whatsapp}
            type="tel"
          />
        </Field>

        <Field label="Observações" hint="Preferências gerais, forma de pagamento, etc.">
          <Textarea
            value={form.notes}
            onChange={set('notes')}
            placeholder="Ex: Prefere voos noturnos, paga em cartão..."
            rows={3}
          />
        </Field>

        <div className="flex gap-3 pt-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
