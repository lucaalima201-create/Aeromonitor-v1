// ============================================================
// AeroMonitor AI — Página: Propostas (WhatsApp + PDF)
// ============================================================
import { useEffect, useState } from 'react';
import { FileOutput, Copy, Check, MessageCircle, Download } from 'lucide-react';
import { quotesDB, requestsDB, clientsDB } from '../db';
import type { QuoteEntry, FlightRequest, Client } from '../types';
import { BAGGAGE_LABELS } from '../types';
import {
  Button, Card, Select, EmptyState, PageHeader, AlertBanner, Field
} from '../components/ui';
import {
  formatCurrency, formatDateTime, formatDuration,
  buildWhatsAppLink
} from '../utils';

const AGENCY_NAME = 'Minha Agência de Viagens';

export default function Proposals() {
  const [quotes, setQuotes] = useState<QuoteEntry[]>([]);
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [agencyName, setAgencyName] = useState(() =>
    localStorage.getItem('agencyName') || AGENCY_NAME
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [q, r, c] = await Promise.all([
        quotesDB.getRecent(200),
        requestsDB.getAll(),
        clientsDB.getAll(),
      ]);
      const clientMap = Object.fromEntries(c.map((x) => [x.id!, x.name]));
      setRequests(r.map((x) => ({ ...x, clientName: clientMap[x.clientId] || '' })));
      setQuotes(q);
      setClients(c);
    })();
  }, []);

  const selectedQuote = quotes.find((q) => String(q.id) === selectedQuoteId);
  const request = selectedQuote ? requests.find((r) => r.id === selectedQuote.requestId) : null;
  const client = request ? clients.find((c) => c.id === request.clientId) : null;

  // Texto da proposta
  const buildProposal = (): string => {
    if (!selectedQuote || !request || !client) return '';
    return `━━━━━━━━━━━━━━━━━━━━━━━
✈️  PROPOSTA DE PASSAGEM AÉREA
${agencyName}
━━━━━━━━━━━━━━━━━━━━━━━

Olá, ${client.name}! 😊

Segue a cotação solicitada para sua viagem:

📍 ROTA
${selectedQuote.origin} → ${selectedQuote.destination}

📅 DATAS
Partida: ${formatDateTime(selectedQuote.departureDateTime)}
${selectedQuote.arrivalDateTime ? `Chegada: ${formatDateTime(selectedQuote.arrivalDateTime)}\n` : ''}${selectedQuote.returnDepartureDateTime ? `Volta: ${formatDateTime(selectedQuote.returnDepartureDateTime)}\n` : ''}
✈️  COMPANHIA AÉREA
${selectedQuote.airline}

🔄 ESCALAS
${selectedQuote.stops === 0 ? 'Voo direto ✅' : `${selectedQuote.stops} escala${selectedQuote.stops > 1 ? 's' : ''}`}

⏱️  DURAÇÃO TOTAL
${formatDuration(selectedQuote.durationMinutes)}

🧳 BAGAGEM INCLUÍDA
${BAGGAGE_LABELS[selectedQuote.baggageIncluded]}

👥 PASSAGEIROS
${selectedQuote.passengers} passageiro${selectedQuote.passengers > 1 ? 's' : ''}

💰 VALOR
${formatCurrency(selectedQuote.totalPrice, selectedQuote.currency)} (total)

━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONDIÇÕES IMPORTANTES

• Esta cotação foi consultada em ${formatDateTime(selectedQuote.consultedAt)}.
• O valor está sujeito à disponibilidade e pode sofrer alterações.
• A tarifa precisa ser confirmada no momento da emissão.
${selectedQuote.isOutdated ? '• ⚠️ ATENÇÃO: Esta cotação pode estar desatualizada (mais de 24h).\n' : ''}
${request.flexibleDates ? '• Datas podem ser ajustadas para melhor tarifa.\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━

Posso prosseguir com a reserva? Qualquer dúvida, estou à disposição! 😊

${agencyName}`;
  };

  const whatsAppText = buildProposal();
  const whatsAppLink = client
    ? buildWhatsAppLink(client.whatsapp, whatsAppText)
    : '';

  const copyProposal = async () => {
    if (!whatsAppText) return;
    await navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPDF = async () => {
    if (!selectedQuote || !request || !client) return;
    // Importação dinâmica para evitar bundle grande
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const lines = whatsAppText.split('\n');
    let y = 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      // Linhas separadoras
      if (line.startsWith('━')) {
        doc.setDrawColor(180, 180, 180);
        doc.line(15, y, 195, y);
        y += 4;
      } else {
        const cleanLine = line.replace(/[✈️📍📅🔄⏱️🧳👥💰⚠️😊]/g, '').trim();
        if (cleanLine) {
          doc.text(cleanLine, 15, y);
          y += 5;
        } else {
          y += 3;
        }
      }
    }

    doc.save(`Proposta_${client.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const quoteOptions = [
    { value: '', label: 'Selecione uma cotação...' },
    ...quotes.map((q) => {
      const req = requests.find((r) => r.id === q.requestId);
      return {
        value: String(q.id),
        label: `${req?.clientName || '?'} · ${q.airline} · ${q.origin}→${q.destination} · ${formatCurrency(q.totalPrice, q.currency)}`,
      };
    }),
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Propostas"
        subtitle="Gere mensagens para WhatsApp e PDFs profissionais"
      />

      <AlertBanner type="info">
        <strong>Revisão obrigatória:</strong> Revise sempre a proposta antes de enviar ao cliente.
        O sistema gera o texto com base nos dados registrados, mas você é responsável pela confirmação
        da disponibilidade e do valor no momento da emissão.
      </AlertBanner>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Configurações */}
        <div className="space-y-4">
          <Card>
            <Field label="Nome da Agência">
              <input
                type="text"
                value={agencyName}
                onChange={(e) => {
                  setAgencyName(e.target.value);
                  localStorage.setItem('agencyName', e.target.value);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da sua agência"
              />
            </Field>
          </Card>

          <Card>
            <Field label="Selecionar Cotação">
              <Select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                options={quoteOptions}
              />
            </Field>

            {selectedQuote && (
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Companhia:</span>
                  <span className="font-medium">{selectedQuote.airline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rota:</span>
                  <span className="font-medium">{selectedQuote.origin} → {selectedQuote.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor total:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(selectedQuote.totalPrice, selectedQuote.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bagagem:</span>
                  <span>{BAGGAGE_LABELS[selectedQuote.baggageIncluded]}</span>
                </div>
                {selectedQuote.isOutdated && (
                  <div className="p-2 bg-orange-50 rounded text-orange-700 text-xs">
                    ⚠️ Esta cotação tem mais de 24h. Confirme o preço antes de enviar.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Botões de ação */}
          {selectedQuote && client && (
            <div className="flex flex-col gap-2">
              <Button onClick={copyProposal} className="w-full justify-center">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Proposta'}
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => window.open(whatsAppLink, '_blank')}
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                Abrir no WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={exportPDF}
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
          )}
        </div>

        {/* Preview da proposta */}
        <Card className="bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileOutput className="w-4 h-4" />
            Preview da Proposta
          </h3>
          {!selectedQuote ? (
            <EmptyState
              icon={<FileOutput className="w-10 h-10" />}
              title="Selecione uma cotação"
              description="O preview da proposta aparecerá aqui."
            />
          ) : (
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[500px]">
              {whatsAppText}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
