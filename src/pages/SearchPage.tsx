// ============================================================
// AeroMonitor AI — Página: Pesquisa Centralizada (Fase 2)
// ============================================================
import { useState } from 'react';
import {
  ExternalLink, Copy, Check, Info, AlertTriangle, Globe
} from 'lucide-react';
import { FLIGHT_PROVIDERS, type SearchParams } from '../providers';
import AirportSelect from '../components/AirportSelect';
import {
  Button, Card, Field, Input, Select, PageHeader, AlertBanner, Badge
} from '../components/ui';

const STATUS_CONFIG = {
  partial: { label: '🟡 Semiautomático', color: 'bg-yellow-100 text-yellow-800' },
  manual_only: { label: '🔴 Manual', color: 'bg-red-100 text-red-800' },
  active: { label: '🟢 Automático', color: 'bg-green-100 text-green-800' },
  unavailable: { label: '⚫ Indisponível', color: 'bg-gray-100 text-gray-800' },
};

export default function SearchPage() {
  const [params, setParams] = useState<Partial<SearchParams>>({
    tripType: 'round_trip',
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [openedLinks, setOpenedLinks] = useState<Set<string>>(new Set());

  const setField = (key: keyof SearchParams, value: unknown) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const isComplete = !!(
    params.origin &&
    params.originCode &&
    params.destination &&
    params.destinationCode &&
    params.departureDate &&
    (params.tripType === 'one_way' || params.returnDate)
  );

  const copySearchData = async () => {
    if (!isComplete) return;
    const text = [
      `Origem: ${params.origin}${params.originCode ? ` (${params.originCode})` : ''}`,
      `Destino: ${params.destination}${params.destinationCode ? ` (${params.destinationCode})` : ''}`,
      `Ida: ${params.departureDate}`,
      params.returnDate ? `Volta: ${params.returnDate}` : '',
      `Adultos: ${params.adults}`,
      params.children ? `Crianças: ${params.children}` : '',
      params.infants ? `Bebês: ${params.infants}` : '',
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(text);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  const openAll = () => {
    if (!isComplete) return;
    const toOpen = FLIGHT_PROVIDERS.filter((p) => {
      const url = p.buildSearchUrl(params as SearchParams);
      return url !== null;
    });
    if (toOpen.length === 0) return;
    // Aviso pop-up
    alert(
      `Serão abertos ${toOpen.length} links em novas abas:\n` +
      toOpen.map((p) => `• ${p.name}`).join('\n') +
      `\n\nSe o navegador bloquear pop-ups, use os botões individuais abaixo.`
    );
    toOpen.forEach((p) => {
      const url = p.buildSearchUrl(params as SearchParams)!;
      window.open(url, '_blank', 'noopener');
      setOpenedLinks((prev) => new Set([...prev, p.id]));
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Pesquisa Centralizada"
        subtitle="Preencha uma vez e pesquise em todas as fontes"
      />

      <AlertBanner type="info">
        <strong>Como funciona:</strong> Google Flights e Skyscanner suportam busca por URL parametrizada
        (abre a pesquisa pré-preenchida). LATAM, GOL e Azul usam SPAs que não aceitam parâmetros via URL —
        para essas companhias, o sistema abre o site e copia os dados para você colar manualmente.
      </AlertBanner>

      {/* Formulário */}
      <Card className="mt-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Origem" required>
              <AirportSelect
                value={{ city: params.origin || '', code: params.originCode }}
                onChange={(v) => setParams((prev) => ({ ...prev, origin: v.city, originCode: v.code }))}
                placeholder="Cidade, aeroporto ou código (ex.: Aracaju)"
              />
            </Field>
            <Field label="Destino" required>
              <AirportSelect
                value={{ city: params.destination || '', code: params.destinationCode }}
                onChange={(v) => setParams((prev) => ({ ...prev, destination: v.city, destinationCode: v.code }))}
                placeholder="Cidade, aeroporto ou código (ex.: GRU)"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tipo de Viagem">
              <Select
                value={params.tripType || 'round_trip'}
                onChange={(e) => setField('tripType', e.target.value)}
                options={[
                  { value: 'round_trip', label: 'Ida e Volta' },
                  { value: 'one_way', label: 'Somente Ida' },
                ]}
              />
            </Field>
            <Field label="Data de Ida" required>
              <Input
                type="date"
                value={params.departureDate || ''}
                onChange={(e) => setField('departureDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </Field>
            {params.tripType !== 'one_way' && (
              <Field label="Data de Volta">
                <Input
                  type="date"
                  value={params.returnDate || ''}
                  onChange={(e) => setField('returnDate', e.target.value)}
                  min={params.departureDate || new Date().toISOString().split('T')[0]}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Adultos">
              <Input
                type="number"
                value={params.adults || 1}
                onChange={(e) => setField('adults', Number(e.target.value))}
                min="1"
                max="9"
              />
            </Field>
            <Field label="Crianças">
              <Input
                type="number"
                value={params.children || 0}
                onChange={(e) => setField('children', Number(e.target.value))}
                min="0"
                max="8"
              />
            </Field>
            <Field label="Bebês">
              <Input
                type="number"
                value={params.infants || 0}
                onChange={(e) => setField('infants', Number(e.target.value))}
                min="0"
                max="4"
              />
            </Field>
          </div>

          {/* Ações gerais */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <Button
              onClick={openAll}
              disabled={!isComplete}
              title="Abre Google Flights e Skyscanner em novas abas"
            >
              <Globe className="w-4 h-4" />
              Abrir fontes disponíveis
            </Button>
            <Button
              variant="outline"
              onClick={copySearchData}
              disabled={!isComplete}
              title="Copia todos os dados da busca"
            >
              {copied === 'all' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              Copiar dados da busca
            </Button>
          </div>

          {!isComplete && (
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Selecione origem e destino na lista de aeroportos e informe a data de ida para habilitar os botões.
            </p>
          )}
        </div>
      </Card>

      {/* Cards de cada provedor */}
      <div className="mt-4 grid gap-3">
        {FLIGHT_PROVIDERS.map((provider) => {
          const url = isComplete ? provider.buildSearchUrl(params as SearchParams) : null;
          const statusCfg = STATUS_CONFIG[provider.integrationStatus];
          const wasOpened = openedLinks.has(provider.id);

          return (
            <Card key={provider.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Logo dot */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: provider.logoColor }}
                >
                  {provider.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{provider.name}</span>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                    {wasOpened && (
                      <Badge className="bg-green-100 text-green-800">✓ Aberto</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{provider.notes}</p>

                  <div className="flex flex-wrap gap-2">
                    {url ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          window.open(url, '_blank', 'noopener');
                          setOpenedLinks((prev) => new Set([...prev, provider.id]));
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pesquisar no {provider.name}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(provider.homeUrl, '_blank', 'noopener');
                          setOpenedLinks((prev) => new Set([...prev, provider.id]));
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir {provider.name}
                      </Button>
                    )}

                    {/* Cópia rápida para SPAs */}
                    {!url && isComplete && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const p = params as SearchParams;
                          const text = [
                            `Origem: ${p.origin}`,
                            `Destino: ${p.destination}`,
                            `Ida: ${p.departureDate}`,
                            p.returnDate ? `Volta: ${p.returnDate}` : '',
                            `Adultos: ${p.adults}`,
                            p.children ? `Crianças: ${p.children}` : '',
                          ].filter(Boolean).join('\n');
                          await navigator.clipboard.writeText(text);
                          setCopied(provider.id);
                          setTimeout(() => setCopied(null), 2000);
                        }}
                      >
                        {copied === provider.id
                          ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copiado!</>
                          : <><Copy className="w-3.5 h-3.5" /> Copiar dados</>
                        }
                      </Button>
                    )}
                  </div>

                  {/* Alerta para sites SPA */}
                  {provider.integrationStatus === 'manual_only' && isComplete && (
                    <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                      <Info className="w-3 h-3 shrink-0" />
                      Clique em "Copiar dados" antes de abrir o site, depois cole no formulário de busca.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
