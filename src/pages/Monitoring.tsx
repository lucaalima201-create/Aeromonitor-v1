// ============================================================
// AeroMonitor AI — Página: Monitoramento + Alertas
// ============================================================
import { useEffect, useState } from 'react';
import { Plus, Bell, Eye, CheckCheck, X } from 'lucide-react';
import { monitoringDB, requestsDB, clientsDB, alertsDB } from '../db';
import type { MonitoringEntry, FlightRequest, AlertEntry } from '../types';
import { ALERT_TYPE_LABELS } from '../types';
import {
  Button, Card, EmptyState, PageHeader, Badge, AlertBanner
} from '../components/ui';
import { formatCurrency, formatDateTime, formatDate } from '../utils';
import MonitoringForm from './MonitoringForm';
import PriceRecordForm from './PriceRecordForm';
import PriceChart from './PriceChart';
import { isStale } from '../monitoring/logic';

export default function Monitoring() {
  const [entries, setEntries] = useState<MonitoringEntry[]>([]);
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [priceFor, setPriceFor] = useState<MonitoringEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'monitoring' | 'alerts'>('monitoring');

  const load = async () => {
    setLoading(true);
    const [mon, reqs, cls, als] = await Promise.all([
      monitoringDB.getAll(),
      requestsDB.getAll(),
      clientsDB.getAll(),
      alertsDB.getAll(),
    ]);
    const clientMap = Object.fromEntries(cls.map((c) => [c.id!, c.name]));
    const enriched = reqs.map((r) => ({ ...r, clientName: clientMap[r.clientId] || '' }));
    setRequests(enriched);
    setEntries(mon);
    setAlerts(als);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isDismissed);

  const markAllRead = async () => {
    for (const a of unreadAlerts) {
      await alertsDB.markRead(a.id!);
    }
    load();
  };

  const dismissAlert = async (id: number) => {
    await alertsDB.dismiss(id);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Monitoramento"
        subtitle="Acompanhe preços e receba alertas de oportunidades"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Novo Monitoramento
          </Button>
        }
      />

      <AlertBanner type="warning">
        <strong>Estratégia ativa: Atualização Manual.</strong> Nesta fase, o monitoramento é baseado
        em preços inseridos manualmente. As atualizações automáticas (via API ou e-mail) estão planejadas
        para fases futuras e ainda não estão disponíveis.
      </AlertBanner>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('monitoring')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'monitoring' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-1" />
          Rotas ({entries.length})
        </button>
        <button
          onClick={() => setTab('alerts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
            tab === 'alerts' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-1" />
          Alertas ({alerts.length})
          {unreadAlerts.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
              {unreadAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Monitoramento */}
      {tab === 'monitoring' && (
        <>
          {loading ? (
            <div className="text-center py-16 text-gray-400">Carregando...</div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<Eye className="w-12 h-12" />}
              title="Nenhuma rota monitorada"
              description="Adicione solicitações para acompanhar a evolução dos preços."
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4" />
                  Adicionar monitoramento
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const req = requests.find((r) => r.id === entry.requestId);
                if (!req) return null;
                const hasTarget = entry.targetPrice > 0;
                const isBelowTarget = entry.lastKnownPrice && entry.lastKnownPrice <= entry.targetPrice;

                return (
                  <Card key={entry.id} className={`${isBelowTarget ? 'border-green-300 bg-green-50' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{req.clientName}</span>
                          <Badge className={entry.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                            {entry.isActive ? '● Ativo' : '○ Pausado'}
                          </Badge>
                          {isBelowTarget && (
                            <Badge className="bg-green-100 text-green-800">🎯 Abaixo do alvo!</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">
                          {req.origin} → {req.destination}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Ida: {formatDate(req.departureDate)}
                          {req.returnDate && ` · Volta: ${formatDate(req.returnDate)}`}
                        </p>

                        {/* Métricas de preço */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 mb-0.5">Preço Alvo</p>
                            <p className="text-sm font-bold text-blue-700">
                              {hasTarget ? formatCurrency(entry.targetPrice, entry.currency) : '—'}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-0.5">Último Preço</p>
                            <p className="text-sm font-bold text-gray-900">
                              {entry.lastKnownPrice ? formatCurrency(entry.lastKnownPrice, entry.currency) : '—'}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded-lg">
                            <p className="text-xs text-green-600 mb-0.5">Menor Registrado</p>
                            <p className="text-sm font-bold text-green-700">
                              {entry.lowestPrice ? formatCurrency(entry.lowestPrice, entry.currency) : '—'}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-600 mb-0.5">Maior Registrado</p>
                            <p className="text-sm font-bold text-red-700">
                              {entry.highestPrice ? formatCurrency(entry.highestPrice, entry.currency) : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Histórico resumido */}
                        {entry.priceHistory.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">
                              Histórico ({entry.priceHistory.length} registro{entry.priceHistory.length !== 1 ? 's' : ''}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {entry.priceHistory.slice(-6).map((point, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                                  title={`${point.source} · ${formatDateTime(point.recordedAt)}`}
                                >
                                  {formatCurrency(point.price, entry.currency)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3"><PriceChart entry={entry} /></div>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <Button size="sm" onClick={() => setPriceFor(entry)}>
                            <Plus className="w-3.5 h-3.5" />
                            Registrar preço
                          </Button>
                          {entry.lastCheckedAt ? (
                            <span className="text-xs text-gray-400">
                              Última atualização: {formatDateTime(entry.lastCheckedAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Nenhum preço registrado ainda</span>
                          )}
                          {isStale(entry) && (
                            <Badge className="bg-orange-100 text-orange-800">Sem atualização há mais de 3 dias</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Alertas */}
      {tab === 'alerts' && (
        <>
          {unreadAlerts.length > 0 && (
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todos como lidos
              </Button>
            </div>
          )}

          {alerts.filter((a) => !a.isDismissed).length === 0 ? (
            <EmptyState
              icon={<Bell className="w-12 h-12" />}
              title="Nenhum alerta"
              description="Os alertas aparecerão aqui quando preços atingirem suas metas ou houver outros eventos."
            />
          ) : (
            <div className="space-y-2">
              {alerts.filter((a) => !a.isDismissed).map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-3 ${!alert.isRead ? 'border-blue-300 bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className={`w-4 h-4 mt-0.5 shrink-0 ${!alert.isRead ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{alert.clientName}</span>
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          {ALERT_TYPE_LABELS[alert.type]}
                        </Badge>
                        {!alert.isRead && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Novo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(alert.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id!)}
                      className="text-gray-400 hover:text-gray-600 shrink-0"
                      title="Dispensar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {priceFor && requests.find((r) => r.id === priceFor.requestId) && (
        <PriceRecordForm
          entry={priceFor}
          request={requests.find((r) => r.id === priceFor.requestId)!}
          onSaved={() => { setPriceFor(null); load(); }}
          onClose={() => setPriceFor(null)}
        />
      )}

      {showForm && (
        <MonitoringForm
          requests={requests}
          onSaved={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
