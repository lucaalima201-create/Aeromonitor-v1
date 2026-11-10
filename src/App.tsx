// ============================================================
// AeroMonitor AI — Entrada da Aplicação (App.tsx)
// ============================================================
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import SearchPage from './pages/SearchPage';
import Quotes from './pages/Quotes';
import Monitoring from './pages/Monitoring';
import Proposals from './pages/Proposals';
import DataPage from './pages/DataPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:clientId/solicitacoes" element={<Requests />} />
          <Route path="/solicitacoes" element={<Requests />} />
          <Route path="/solicitacoes/:id" element={<RequestDetail />} />
          <Route path="/pesquisa" element={<SearchPage />} />
          <Route path="/cotacoes" element={<Quotes />} />
          <Route path="/monitoramento" element={<Monitoring />} />
          <Route path="/propostas" element={<Proposals />} />
          <Route path="/dados" element={<DataPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
