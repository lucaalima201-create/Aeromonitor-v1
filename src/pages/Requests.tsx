// ============================================================
// AeroMonitor AI — Página: Solicitações
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, FileText, Eye, Edit2, Trash2, Plane
} from 'lucide-react';
import { requestsDB, clientsDB } from '../db';
import type { Client, FlightRequest } from '../types';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  BAGGAGE_LABELS,
} from '../types';
import {
  Button, Card, Select, EmptyState, ConfirmDialog, PageHeader, Badge
} from '../components/ui';
import { formatDate, formatCurrency, daysUntilTravel } from '../utils';
import RequestForm from './RequestForm';
import { formatLocation } from '../data/airportSearch';

export default function Requests() {
  const { clientId } = useParams();
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClientId, setFilterClientId] = useState<string>(clientId || 'all');
  const [showForm, setShowForm] = useState(false);
  const [editRequest, setEditRequest] = useState<FlightRequest | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const [reqs, cls] = await Promise.all([
      requestsDB.getAll(),
      clientsDB.getAll(),
    ]);
    // Desnormaliza nome do cliente
    const clientMap = Object.fromEntries(cls.map((c) => [c.id!, c.name]));
    const enriched = reqs.map((r) => ({ ...r, clientName: clientMap[r.clientId] || 'Desconhecido' }));
    setRequests(enriched);
    setClients(cls);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterClientId !== 'all' && String(r.clientId) !== filterClientId) return false;
    return true;
  });

  const handleDelete = async () => {
    if (deleteId == null) return;
    await requestsDB.delete(deleteId);
    setDeleteId(null);
    load();
  };

  const clientOptions = [
    { value: 'all', label: 'Todos os clientes' },
    ...clients.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    ...Object.entries(REQUEST_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Solicitações"
        subtitle={`${requests.length} solicitaç${requests.length !== 1 ? 'ões' : 'ão'} cadastrada${requests.length !== 1 ? 's' : ''}`}
        action={
          <Button onClick={() => { setEditRequest(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            Nova Solicitação
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[180px]">
          <Select
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            options={clientOptions}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={statusOptions}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="Nenhuma solicitação encontrada"
          description={
            requests.length === 0
              ? 'Cadastre solicitações de cotação dos seus clientes.'
              : 'Ajuste os filtros para ver outras solicitações.'
          }
          action={
            requests.length === 0 ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                Nova Solicitação
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((req) => {
            const days = daysUntilTravel(req.departureDate);
            const isUrgent = days >= 0 && days <= 7;
            return (
              <Card key={req.id} className={`hover:shadow-md transition-shadow ${isUrgent ? 'border-orange-300' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                    <Plane className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{req.clientName}</span>
                      <Badge className={REQUEST_STATUS_COLORS[req.status]}>
                        {REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                      {isUrgent && (
                        <Badge className="bg-orange-100 text-orange-800">
                          ⚡ {days === 0 ? 'Hoje' : `${days}d`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {formatLocation(req.origin, req.originCode)} → {formatLocation(req.destination, req.destinationCode)}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>Ida: {formatDate(req.departureDate)}</span>
                      {req.returnDate && <span>Volta: {formatDate(req.returnDate)}</span>}
                      <span>
                        {req.adults} adulto{req.adults !== 1 ? 's' : ''}
                        {req.children > 0 ? `, ${req.children} criança${req.children !== 1 ? 's' : ''}` : ''}
                        {req.infants > 0 ? `, ${req.infants} bebê${req.infants !== 1 ? 's' : ''}` : ''}
                      </span>
                      <span>{BAGGAGE_LABELS[req.baggagePreference]}</span>
                      {req.targetPrice && (
                        <span className="text-green-700 font-medium">
                          Meta: {formatCurrency(req.targetPrice, req.currency)}
                        </span>
                      )}
                    </div>
                    {req.directFlightPreference && (
                      <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        Voo direto
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      title="Criar cotação para esta solicitação"
                      onClick={() => navigate(`/solicitacoes/${req.id}?criarCotacao=1`)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Criar cotação</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ver detalhes e cotações"
                      onClick={() => navigate(`/solicitacoes/${req.id}`)}
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Editar"
                      onClick={() => { setEditRequest(req); setShowForm(true); }}
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Excluir"
                      onClick={() => setDeleteId(req.id!)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <RequestForm
          request={editRequest}
          clients={clients}
          defaultClientId={filterClientId !== 'all' ? Number(filterClientId) : undefined}
          onSaved={() => { setShowForm(false); setEditRequest(null); load(); }}
          onClose={() => { setShowForm(false); setEditRequest(null); }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Excluir solicitação"
        message="Isso também excluirá cotações e histórico relacionados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
