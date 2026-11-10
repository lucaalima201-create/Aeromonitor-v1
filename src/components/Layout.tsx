// ============================================================
// AeroMonitor AI — Componente: Layout (Sidebar + Header)
// ============================================================
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Search,
  TrendingDown,
  Bell,
  FileOutput,
  Menu,
  X,
  Plane,
  Database,
} from 'lucide-react';
import { useAppStore } from '../store';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/solicitacoes', icon: FileText, label: 'Solicitações' },
  { to: '/pesquisa', icon: Search, label: 'Pesquisa' },
  { to: '/cotacoes', icon: TrendingDown, label: 'Cotações' },
  { to: '/monitoramento', icon: Bell, label: 'Monitoramento' },
  { to: '/propostas', icon: FileOutput, label: 'Propostas' },
  { to: '/dados', icon: Database, label: 'Dados & Backup' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stats = useAppStore((s) => s.stats);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-blue-900 text-white flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">AeroMonitor AI</div>
            <div className="text-blue-300 text-xs">Agência de Viagens</div>
          </div>
          <button
            className="ml-auto md:hidden text-blue-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm transition-colors relative
                ${isActive
                  ? 'bg-blue-700 text-white font-medium'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {label === 'Monitoramento' && stats && stats.unreadAlerts > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {stats.unreadAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer aviso LGPD */}
        <div className="px-4 py-3 border-t border-blue-800 text-xs text-blue-300">
          <p>⚠️ Dados armazenados localmente no navegador.</p>
          <p className="mt-1">Faça backup regularmente.</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header mobile */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">AeroMonitor AI</span>
          </div>
          {stats && stats.unreadAlerts > 0 && (
            <NavLink to="/monitoramento" className="ml-auto">
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {stats.unreadAlerts} alertas
              </span>
            </NavLink>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
