// ============================================================
// AeroMonitor AI — Página: Dados & Backup
// ============================================================
import { useState } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportBackup, importBackup, db } from '../db';
import { Button, Card, PageHeader, AlertBanner, ConfirmDialog } from '../components/ui';

export default function DataPage() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aeromonitor-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('success', 'Backup exportado com sucesso!');
    } catch (e) {
      showMsg('error', 'Erro ao exportar backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        await importBackup(text);
        showMsg('success', 'Backup restaurado! Recarregue a página para ver os dados atualizados.');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        showMsg('error', `Erro ao importar: ${err instanceof Error ? err.message : 'Arquivo inválido.'}`);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    try {
      await db.clients.clear();
      await db.requests.clear();
      await db.quotes.clear();
      await db.monitoring.clear();
      await db.alerts.clear();
      setShowClearConfirm(false);
      showMsg('success', 'Todos os dados foram apagados.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      showMsg('error', 'Erro ao apagar dados.');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Dados & Backup"
        subtitle="Gerencie seus dados locais com segurança"
      />

      {/* Mensagem de feedback */}
      {message && (
        <div className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Aviso sobre armazenamento local */}
      <AlertBanner type="warning">
        <strong>⚠️ Armazenamento Local (LGPD):</strong> Todos os dados são armazenados exclusivamente
        no <strong>IndexedDB do seu navegador</strong>, neste dispositivo. Eles <strong>não são enviados
        para nenhum servidor</strong>, não são sincronizados entre dispositivos e podem ser perdidos
        se você limpar os dados do navegador ou reinstalar o sistema operacional.
        <br /><br />
        Exporte um backup regularmente e guarde o arquivo em local seguro.
      </AlertBanner>

      <div className="grid gap-4 mt-4">
        {/* Exportar Backup */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-green-100 p-3 rounded-xl shrink-0">
              <Download className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Exportar Backup</h3>
              <p className="text-sm text-gray-500 mb-3">
                Salva todos os dados (clientes, solicitações, cotações, monitoramento e alertas)
                em um arquivo JSON no seu computador. Faça isso regularmente.
              </p>
              <Button onClick={handleExport} loading={exporting}>
                <Download className="w-4 h-4" />
                Exportar Backup Agora
              </Button>
            </div>
          </div>
        </Card>

        {/* Importar Backup */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-xl shrink-0">
              <Upload className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Restaurar Backup</h3>
              <p className="text-sm text-gray-500 mb-1">
                Importa um arquivo de backup anteriormente exportado por este sistema.
              </p>
              <AlertBanner type="warning">
                <strong>Atenção:</strong> A restauração substitui TODOS os dados atuais. Exporte um backup
                antes de restaurar.
              </AlertBanner>
              <Button variant="secondary" onClick={handleImport} loading={importing} className="mt-3">
                <Upload className="w-4 h-4" />
                Selecionar arquivo de backup
              </Button>
            </div>
          </div>
        </Card>

        {/* Informações técnicas */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-gray-100 p-3 rounded-xl shrink-0">
              <Database className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Informações Técnicas</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Banco de dados:</strong> IndexedDB (AeroMonitorAI)</p>
                <p><strong>Tecnologia:</strong> Dexie.js v4 (wrapper do IndexedDB)</p>
                <p><strong>Localização:</strong> Armazenamento interno do navegador</p>
                <p><strong>Versão do schema:</strong> 1</p>
                <p><strong>Tabelas:</strong> clients, requests, quotes, monitoring, alerts</p>
                <p><strong>Acesso:</strong> Somente este navegador, neste dispositivo</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Zona de Perigo */}
        <Card className="border-red-200">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-xl shrink-0">
              <Trash2 className="w-5 h-5 text-red-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 mb-1">Zona de Perigo</h3>
              <p className="text-sm text-gray-500 mb-3">
                Apaga permanentemente todos os dados. Esta ação não pode ser desfeita.
                Exporte um backup antes de continuar.
              </p>
              <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
                <Trash2 className="w-4 h-4" />
                Apagar Todos os Dados
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="Apagar todos os dados"
        message="Isso apagará permanentemente todos os clientes, solicitações, cotações, monitoramentos e alertas. Você tem um backup? Esta ação NÃO pode ser desfeita."
        confirmLabel="Sim, apagar tudo"
        danger
      />
    </div>
  );
}
