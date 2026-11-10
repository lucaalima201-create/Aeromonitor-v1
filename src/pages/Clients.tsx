// ============================================================
// AeroMonitor AI — Página: Clientes
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, MessageCircle, Users } from 'lucide-react';
import { clientsDB } from '../db';
import type { Client } from '../types';
import {
  Button, Card, Input, EmptyState, ConfirmDialog, PageHeader
} from '../components/ui';
import { formatDate, formatPhone, buildWhatsAppLink } from '../utils';
import ClientForm from './ClientForm';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const all = await clientsDB.getAll();
    setClients(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp.includes(search)
  );

  const handleDelete = async () => {
    if (deleteId == null) return;
    await clientsDB.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditClient(null);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cliente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => { setEditClient(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        }
      />

      {/* Busca */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={search ? 'Tente outro termo de busca.' : 'Clique em "Novo Cliente" para começar.'}
          action={
            !search ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                Cadastrar primeiro cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    📱 {formatPhone(client.whatsapp)}
                  </p>
                  {client.notes && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{client.notes}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    Cadastrado em {formatDate(client.createdAt)}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Abrir WhatsApp"
                    onClick={() => window.open(buildWhatsAppLink(client.whatsapp, ''), '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Ver solicitações"
                    onClick={() => navigate(`/clientes/${client.id}/solicitacoes`)}
                  >
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar"
                    onClick={() => { setEditClient(client); setShowForm(true); }}
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Excluir"
                    onClick={() => setDeleteId(client.id!)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {showForm && (
        <ClientForm
          client={editClient}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditClient(null); }}
        />
      )}

      {/* Confirm Exclusão */}
      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir cliente"
        message="Isso também excluirá todas as solicitações, cotações e histórico relacionados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
