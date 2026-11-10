// ============================================================
// AeroMonitor AI — Dashboard
// ============================================================
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, TrendingDown, Bell, CheckCircle, AlertCircle,
  Clock, Plane, ChevronRight, Eye
} from 'lucide-react';
import { useAppStore } from '../store';
import { Card, StatCard, Badge, EmptyState } from '../components/ui';
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
} from '../types';
import { formatCurrency, formatDateTime, daysUntilTravel } from '../utils';

export default function Dashboard() {
  const { stats, loadAll, alerts } = useAppStore();

  useEffect(() => {
    loadAll();
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isDismissed);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visão geral do atendimento e cotações
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Clientes"
          value={stats?.totalClients ?? 0}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Abertas"
          value={stats?.openRequests ?? 0}
          icon={<FileText className="w-5 h-5 text-orange-600" />}
          color="bg-orange-50"
          sub="solicitações"
        />
        <StatCard
          label="Monitorando"
          value={stats?.monitoredRoutes ?? 0}
          icon={<Eye className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
          sub="rotas"
        />
        <StatCard
          label="Propostas"
          value={stats?.proposalsSent ?? 0}
          icon={<TrendingDown className="w-5 h-5 text-indigo-600" />}
          color="bg-indigo-50"
          sub="enviadas"
        />
        <StatCard
          label="Concluídas"
          value={stats?.salesCompleted ?? 0}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          color="bg-green-50"
          sub="vendas"
        />
        <StatCard
          label="Alertas"
          value={stats?.unreadAlerts ?? 0}
          icon={<Bell className="w-5 h-5 text-red-600" />}
          color="bg-red-50"
          sub="não lidos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alertas Recentes */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              Alertas
            </h2>
            <Link to="/monitoramento" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {unreadAlerts.length === 0 ? (
            <EmptyState
              icon={<Bell className="w-8 h-8" />}
              title="Nenhum alerta"
              description="Tudo em dia!"
            />
          ) : (
            <div className="space-y-2">
              {unreadAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs font-medium text-red-800">{alert.clientName}</p>
                  <p className="text-xs text-red-700 mt-0.5">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Clientes Aguardando Retorno */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Aguardando Retorno
            </h2>
            <Link to="/solicitacoes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {!stats?.pendingClients?.length ? (
            <EmptyState
              icon={<Clock className="w-8 h-8" />}
              title="Nenhuma pendente"
              description="Sem propostas aguardando retorno."
            />
          ) : (
            <div className="space-y-2">
              {stats.pendingClients.slice(0, 5).map((req) => {
                const days = daysUntilTravel(req.departureDate);
                return (
                  <Link
                    key={req.id}
                    to={`/solicitacoes/${req.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{req.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {req.origin} → {req.destination}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={REQUEST_STATUS_COLORS[req.status]}>
                        {REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                      {days >= 0 && (
                        <p className={`text-xs mt-1 ${days <= 7 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {days === 0 ? 'Hoje!' : `${days}d`}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Cotações Recentes */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-500" />
              Últimas Cotações
            </h2>
            <Link to="/cotacoes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {!stats?.recentQuotes?.length ? (
            <EmptyState
              icon={<Plane className="w-8 h-8" />}
              title="Nenhuma cotação"
              description="Registre cotações encontradas nas companhias aéreas."
            />
          ) : (
            <div className="space-y-2">
              {stats.recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{q.airline}</p>
                    <p className="text-xs text-gray-500">
                      {q.origin} → {q.destination} · {q.source}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(q.consultedAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-700">
                      {formatCurrency(q.totalPrice, q.currency)}
                    </p>
                    {q.isOutdated && (
                      <span className="text-xs text-orange-500 flex items-center gap-1 justify-end">
                        <AlertCircle className="w-3 h-3" />
                        Desatualizada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Aviso LGPD */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <strong>📋 Informação importante sobre seus dados:</strong> Todas as informações de clientes e
        cotações são armazenadas exclusivamente no <strong>IndexedDB do seu navegador</strong>, neste
        dispositivo. Os dados não são sincronizados automaticamente e podem ser perdidos se você limpar
        os dados do navegador. Exporte um backup regularmente em <Link to="/dados" className="underline font-medium">Dados &amp; Backup</Link>.
      </div>
    </div>
  );
}
