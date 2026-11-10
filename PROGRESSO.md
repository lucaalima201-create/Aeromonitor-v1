# PROGRESSO — AeroMonitor AI

Atualizado em 09/11/2026.

## Como rodar
```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm test         # 46 testes unitários (Vitest)
npm run build    # tsc + build de produção
npm run e2e      # teste no navegador (Edge headless) — exige o servidor dev rodando
```
No PowerShell com scripts bloqueados, use `cmd /c "npm run dev"`.
O E2E usa o Edge instalado em `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` (ajuste em `e2e/flow.mjs` se necessário) e um perfil limpo a cada execução (não toca nos seus dados reais).

## Verificado nesta etapa (executado de fato)
| Verificação | Resultado |
|---|---|
| `npm test` | ✅ 46/46 (5 arquivos) |
| `npm run build` | ✅ passa (aviso de bundle >500 kB, sem code splitting) |
| E2E no Edge (`e2e/flow.mjs`) | ✅ 54/54 |

O E2E cobre: busca de aeroportos, preço máximo, criar solicitação, criar cotação a partir dela, pré-preenchimento, duas+ ofertas na mesma solicitação, **recarregar a página**, conferência direta no IndexedDB (relacionamentos), Propostas, Monitoramento e largura de 375 px (sem rolagem horizontal).
Não foi testado em celular físico nem em Chrome/Firefox/Safari.

## Implementado nesta etapa
1. **Origem/Destino** — as caixinhas vazias eram campos opcionais de código IATA (`w-16`, 3 letras), desligados da cidade. Substituídas por um seletor único (`AirportSelect`): busca por cidade, nome do aeroporto ou código, sem acento, com navegação por teclado.
   - Base: `src/data/airports.ts`, **129 aeroportos brasileiros** gerados a partir do OurAirports (domínio público; filtros: BR, voo regular, código IATA). Nenhum código foi digitado à mão nem derivado do nome da cidade.
   - Cidades com vários aeroportos listam cada um. Opção "todos os aeroportos" apenas para **São Paulo (SAO)** e **Rio de Janeiro (RIO)** — essa lista curta é manual (`METRO_AREAS`); só aparece se todos os aeroportos membros existem na base.
   - Digitar depois de selecionar invalida o código; o salvamento exige aeroporto selecionado.
   - A página **Pesquisa** usa o mesmo seletor.
2. **Preço máximo** — campo largo (R$ prefixado), opcional, aceita `800`, `800,00`, `1.250,50`, grava número (`1250.5`). A escolha de moeda foi removida da solicitação (a agência opera em R$; solicitações antigas mantêm a moeda gravada). Quando o texto é inválido, mostra erro.
3. **Solicitação → Cotação** — botão "Criar cotação" na lista e na nova página de detalhe `/solicitacoes/:id`. O formulário recebe automaticamente: solicitação (travada), cliente, origem, destino, data de ida/volta e nº de passageiros. **Horários, companhia, escalas, preço, taxas e bagagem incluída NÃO são preenchidos** (a bagagem desejada aparece como referência). Em Cotações também é possível escolher a solicitação, com o mesmo preenchimento. Várias cotações por solicitação.
4. **Divergências** — rota, datas ou passageiros diferentes da solicitação geram aviso claro; exigem justificativa escrita para salvar; a solicitação original nunca é alterada; a cotação guarda a lista de divergências e a justificativa. Bagagem menor que a desejada é aviso não bloqueante.
5. **Detalhe da solicitação** — lista as cotações vinculadas e destaca a **melhor oferta comparável**: mesma rota/datas/passageiros, bagagem ≥ desejada, mesma moeda, consulta < 24 h (se o cliente prefere voo direto e existe direto elegível, só diretos competem). Ofertas excluídas mostram o motivo.

## Correções feitas no caminho
- **Validação do WhatsApp** rejeitava `(79) 99999-0000`, o formato sugerido pela própria mensagem de ajuda. Agora valida pelos dígitos (10–11, ou 12–13 com 55).
- **Skyscanner:** URL usava `yyyymmdd`, caminho `/transporte/voos/` e fazia fallback com as 3 primeiras letras da cidade. Agora: códigos IATA reais em minúsculas, `YYMMDD`, `/transport/flights/`; sem código, não gera link. Google Flights passa a usar os códigos (nome da cidade para SAO/RIO).
- Selo "Diverge da solicitação" só para rota/datas/passageiros.

## Limitações e pontos de atenção
- ⚠️ **Skyscanner exibiu CAPTCHA ao navegador automatizado.** Não foi contornado. O caminho gerado foi preservado no redirecionamento, mas **a abertura do resultado real não foi confirmada**; num navegador normal você resolve o CAPTCHA e deve funcionar. Google Flights (`?q=`) também não teve o resultado conferido; apenas a URL gerada foi verificada.
- Solicitações criadas antes desta versão sem código IATA aparecem com aviso e precisam de um aeroporto selecionado ao editar. Cotações antigas continuam válidas (comparação por texto quando não há códigos).
- Aeroportos: a base do OurAirports pode ter nomes em inglês e omitir aeroportos sem voo regular ou recém-abertos (ex.: Pampulha/PLU não consta). Atualização: baixar o CSV de novo e regerar `airports.ts`.
- Preço/taxas na **cotação** continuam em campos numéricos simples (não usam o novo campo monetário).
- `/solicitacoes/:id` agora é a tela de detalhe; contador de alertas da barra lateral ainda só carrega após abrir o Dashboard.
- Propostas e Monitoramento: apenas verificado que abrem e que Propostas gera o texto com a cotação nova; não houve mudança de código neles.
- Sem Git/GitHub configurado (nada publicado). `.gitignore` agora ignora `e2e-shots/`. Backups JSON contêm dados de clientes: não versionar.

## Simplificação do formulário "Registrar Cotação" (09/11/2026, 2ª rodada)
- **Voo de ida** e **Voo de volta** agora têm só *Data de partida* e *Horário de partida*, lado a lado (2 colunas, inclusive no celular). Ida continua obrigatória; volta continua opcional (se preencher a data, exige o horário e vice-versa).
- Campos e validações de **chegada** removidos do formulário. `arrivalDateTime` passou a ser opcional no tipo `QuoteEntry`.
- **Dados antigos preservados:** ao editar uma cotação que já tem chegada gravada, os valores são mantidos (não aparecem na tela, mas não são apagados). Cotações novas não gravam chegada. As telas Cotações, Detalhe da solicitação e Propostas mostram a chegada só quando existe.
- Nada mais mudou no formulário (companhia, origem, destino, escalas, duração, passageiros, preços, taxas, bagagem, divergências).
- Verificado: `npm test` 46/46; `npm run build` OK; E2E no Edge **61/61** (inclui: campos de chegada ausentes; ida e volta com só 2 datas + 2 horários; salvar sem horário de partida é bloqueado; cotação legada com chegada → editar taxas → chegada preservada e total recalculado; Propostas gera texto com o total atualizado).
- Observação: se, ao editar, você mudar a data de partida de uma cotação antiga, a chegada antiga continua gravada e pode ficar inconsistente com a nova partida (não é exibida nem validada).

## Próxima etapa recomendada
1. Usar o app com 2–3 solicitações reais e anotar atritos (principalmente o fluxo de cotação).
2. Validar manualmente os links Google Flights/Skyscanner no seu navegador.
3. Usar o campo monetário também na cotação; filtros de data/destino no Dashboard.
4. Só depois, Fase 4 (alertas do Google Flights via Gmail).
