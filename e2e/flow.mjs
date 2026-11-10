// Teste E2E (navegador real: Edge headless) — Fase 1: aeroportos, preço, solicitação → cotação, persistência.
// Uso: com o servidor em http://127.0.0.1:5173  →  node e2e/flow.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const SHOTS = process.env.SHOTS_DIR ?? './e2e-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('dialog', (d) => d.accept());

// Localiza o controle que acompanha um <label> (Field não usa htmlFor).
const f = (label, n = 0) =>
  page.locator(`xpath=(//label[starts-with(normalize-space(.),"${label}")]/following-sibling::*[1])`).nth(n);
const input = (label, n = 0) => f(label, n).locator('input,select,textarea').first();
const field = (label, n = 0) => {
  // O controle pode ser o próprio irmão (input/select) ou estar dentro de um wrapper.
  return page.locator(
    `xpath=(//label[starts-with(normalize-space(.),"${label}")]/following-sibling::*[1])[${n + 1}]/descendant-or-self::*[self::input or self::select or self::textarea][1]`
  );
};

try {
  // ---------- Cliente ----------
  await page.goto(`${BASE}/clientes`);
  await page.getByRole('button', { name: /Novo Cliente/ }).first().click();
  await field('Nome completo').fill('Maria Teste E2E');
  await field('WhatsApp').fill('(79) 99999-0000');
  await page.getByRole('button', { name: 'Cadastrar Cliente' }).click();
  await page.getByText('Maria Teste E2E').waitFor();
  check('Cliente cadastrado', true);

  // ---------- Solicitação: aeroportos ----------
  await page.goto(`${BASE}/solicitacoes`);
  await page.getByRole('button', { name: /Nova Solicitação/ }).first().click();
  await field('Cliente').selectOption({ label: 'Maria Teste E2E' });

  const origem = field('Origem');
  await origem.fill('Aracaju');
  const optAju = page.getByRole('option', { name: /Aracaju \(AJU\)/ });
  await optAju.waitFor();
  check('T1a: "Aracaju" oferece "Aracaju (AJU)"', await optAju.count() >= 1);
  await page.screenshot({ path: `${SHOTS}/01-dropdown-aracaju.png` });
  await optAju.first().click();
  check('T1b: seleção confirma código IATA', await page.getByText('Código IATA confirmado: AJU').isVisible());

  await origem.fill('xyzzy');
  check('T1c: busca sem resultado não inventa código', await page.getByText('Nenhum aeroporto encontrado').isVisible());
  await origem.fill('Aracaju');
  await page.getByRole('option', { name: /Aracaju \(AJU\)/ }).first().click();

  const destino = field('Destino');
  await destino.fill('sao paulo');
  const opts = await page.getByRole('option').allInnerTexts();
  console.log('   opções para "sao paulo":', JSON.stringify(opts.map((o) => o.replace(/\n/g, ' | '))));
  check('T1d: São Paulo lista todos (SAO), Guarulhos (GRU) e Congonhas (CGH)',
    opts.some((o) => o.includes('(SAO)')) && opts.some((o) => o.includes('(GRU)')) && opts.some((o) => o.includes('(CGH)')));
  await page.screenshot({ path: `${SHOTS}/02-dropdown-sao-paulo.png` });
  await page.getByRole('option', { name: /\(GRU\)/ }).first().click();
  check('T1e: destino GRU confirmado', await page.getByText('Código IATA confirmado: GRU').isVisible());

  // Digitar depois de selecionar invalida o código
  await destino.fill('Guarul');
  check('T1f: editar o texto remove o código confirmado', !(await page.getByText('Código IATA confirmado: GRU').isVisible()));
  await page.getByRole('option', { name: /\(GRU\)/ }).first().click();

  // ---------- Solicitação: demais campos + preço ----------
  await field('Data de Ida').fill('2027-02-15');
  await field('Data de Volta').fill('2027-02-22');
  await field('Adultos').fill('2');
  await field('Bagagem Desejada').selectOption({ label: 'Despachada 23kg' });

  const preco = field('Preço Máximo Desejado');
  const box = await preco.boundingBox();
  check('T2a: campo de preço tem largura utilizável (>=150px)', box && box.width >= 150, `largura=${Math.round(box?.width ?? 0)}px`);
  await preco.fill('abc');
  check('T2b: letras são descartadas na digitação', (await preco.inputValue()) === '');
  await preco.fill('1,2,3');
  await page.getByRole('button', { name: 'Criar Solicitação' }).click();
  check('T2c: valor inválido bloqueia o salvamento com mensagem', await page.getByText(/Valor inválido/).isVisible());
  await preco.fill('1250,5');
  await preco.blur();
  check('T2d: "1250,5" é formatado como 1.250,50', (await preco.inputValue()) === '1.250,50', await preco.inputValue());
  await page.screenshot({ path: `${SHOTS}/03-form-solicitacao.png` });
  await page.getByRole('button', { name: 'Criar Solicitação' }).click();
  await page.getByText('Meta: R$ 1.250,50').waitFor();
  const cardText = await page.locator('body').innerText();
  check('T3: solicitação criada e listada com preço máximo R$ 1.250,50', /1\.250,50/.test(cardText));

  // Preço opcional: salvar outra solicitação sem preço é testado via unit (parseMoney('') = null) e abaixo
  // ---------- Criar cotação a partir da solicitação ----------
  await page.getByRole('button', { name: /Criar cotação/ }).first().click();
  await page.waitForURL(/\/solicitacoes\/\d+/);
  const requestId = Number(page.url().match(/solicitacoes\/(\d+)/)[1]);
  await page.getByText('Registrar Cotação').first().waitFor();
  check('T4: "Criar cotação" abre o formulário na página da solicitação', true, `solicitação #${requestId}`);

  const reqSel = field('Solicitação do Cliente');
  check('T5a: solicitação vinculada e travada', (await reqSel.inputValue()) === String(requestId) && await reqSel.isDisabled());
  check('T5b: origem preenchida', (await field('Origem da oferta').inputValue()) === 'Aracaju (AJU)', await field('Origem da oferta').inputValue());
  check('T5c: destino preenchido', (await field('Destino da oferta').inputValue()) === 'São Paulo (GRU)', await field('Destino da oferta').inputValue());
  check('T5d: data de ida preenchida', (await field('Data de partida', 0).inputValue()) === '2027-02-15');
  check('T5e: data de volta preenchida', (await field('Data de partida', 1).inputValue()) === '2027-02-22');
  check('T5f: passageiros = 2', (await field('Passageiros').inputValue()) === '2');
  check('T5g: horários NÃO preenchidos', (await field('Horário de partida', 0).inputValue()) === '' && (await field('Horário de partida', 1).inputValue()) === '');
  check('T5h: bagagem da oferta NÃO preenchida (exibe a desejada como referência)',
    (await field('Bagagem incluída na oferta').inputValue()) === '' && await page.getByText('O cliente deseja: Despachada 23kg').isVisible());
  check('T5x: campos de chegada não existem mais no formulário',
    (await page.getByText('Data de chegada').count()) === 0 && (await page.getByText('Horário de chegada').count()) === 0);
  check('T5y: ida e volta têm só data e horário de partida (2 campos cada)',
    (await page.locator('input[type=date]').count()) === 2 && (await page.locator('input[type=time]').count()) === 2);
  check('T5i: sem aviso de divergência com dados iguais', !(await page.getByText('difere da solicitação').count()));
  await page.screenshot({ path: `${SHOTS}/04-cotacao-prefill.png`, fullPage: false });

  const fillQuote = async ({ airline, dep, rdep, base, taxes, bag, duration = '180' }) => {
    await field('Companhia Aérea').fill(airline);
    await field('Horário de partida', 0).fill(dep);
    await field('Horário de partida', 1).fill(rdep);
    await field('Duração total').fill(duration);
    await field('Preço base').fill(base);
    await field('Taxas').fill(taxes);
    await field('Bagagem incluída na oferta').selectOption({ label: bag });
  };

  // Validação: sem horário não salva
  await page.getByRole('button', { name: 'Registrar Cotação' }).last().click();
  check('T5j: salvar sem horários reais é bloqueado', await page.getByText('Informe o horário real da oferta').first().isVisible());

  // Oferta 1
  await fillQuote({ airline: 'LATAM', dep: '08:00', rdep: '18:00', base: '600', taxes: '50', bag: 'Despachada 23kg' });
  await page.getByRole('button', { name: 'Registrar Cotação' }).last().click();
  await page.getByText('Cotações vinculadas (1)').waitFor();
  check('T6a: primeira oferta (LATAM) salva e vinculada', true);

  // Oferta 2 (bagagem menor)
  await page.getByRole('button', { name: /Criar cotação/ }).first().click();
  await page.getByText('Registrar Cotação').first().waitFor();
  check('T6b: novo formulário também vem pré-preenchido', (await field('Destino da oferta').inputValue()) === 'São Paulo (GRU)');
  await fillQuote({ airline: 'GOL', dep: '09:30', rdep: '17:10', base: '550', taxes: '40', bag: 'Apenas bagagem de mão', duration: '190' });
  check('T6c: bagagem menor gera aviso (não bloqueante)', await page.getByText('bagagem incluída na oferta é menor').isVisible());
  await page.getByRole('button', { name: 'Registrar Cotação' }).last().click();
  await page.getByText('Cotações vinculadas (2)').waitFor();
  check('T6d: segunda oferta (GOL) salva na mesma solicitação', true);

  // Oferta 3: divergente (data diferente) exige justificativa
  await page.getByRole('button', { name: /Criar cotação/ }).first().click();
  await page.getByText('Registrar Cotação').first().waitFor();
  await field('Data de partida', 0).fill('2027-02-16');
  check('T7a: data diferente exibe aviso claro', await page.getByText(/Data de ida da oferta \(16\/02\/2027\) difere da solicitação \(15\/02\/2027\)/).isVisible());
  await fillQuote({ airline: 'Azul', dep: '07:00', rdep: '19:00', base: '400', taxes: '30', bag: 'Despachada 23kg', duration: '175' });
  await page.getByRole('button', { name: 'Registrar Cotação' }).last().click();
  check('T7b: divergência sem justificativa é bloqueada', await page.getByText(/Justifique a diferença/).isVisible());
  await field('Justificativa da diferença').fill('Cliente aceitou sair um dia depois (datas flexíveis)');
  await page.getByRole('button', { name: 'Registrar Cotação' }).last().click();
  await page.getByText('Cotações vinculadas (3)').waitFor();
  check('T7c: com justificativa a oferta divergente é salva', true);

  // ---------- Melhor comparável ----------
  const body1 = await page.locator('body').innerText();
  const bestCard = page.locator('div', { hasText: 'Melhor oferta comparável' }).last();
  check('T8a: melhor comparável = LATAM R$ 1.300,00 (menor equivalente)', /LATAM[\s\S]{0,60}R\$\s?1\.300,00/.test(body1));
  check('T8b: GOL (bagagem menor) e Azul (data diferente) ficam fora, com motivo',
    body1.includes('Bagagem inferior à desejada') && body1.includes('Rota, datas ou passageiros diferentes'));
  check('T8c: justificativa da divergência exibida', body1.includes('Cliente aceitou sair um dia depois'));
  await page.screenshot({ path: `${SHOTS}/05-detalhe-solicitacao.png`, fullPage: true });

  // ---------- Persistência após recarregar ----------
  await page.reload();
  await page.getByText('Cotações vinculadas (3)').waitFor();
  const body2 = await page.locator('body').innerText();
  check('T9a: após reload, 3 cotações continuam vinculadas à solicitação', true);
  check('T9b: após reload, melhor comparável e justificativa preservados',
    /LATAM[\s\S]{0,60}R\$\s?1\.300,00/.test(body2) && body2.includes('Cliente aceitou sair um dia depois'));

  const db = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('AeroMonitorAI');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const d = open.result;
      const out = {};
      const tx = d.transaction(['requests', 'quotes', 'clients'], 'readonly');
      let pending = 3;
      for (const s of ['requests', 'quotes', 'clients']) {
        const r = tx.objectStore(s).getAll();
        r.onsuccess = () => { out[s] = r.result; if (--pending === 0) resolve(out); };
      }
    };
  }));
  const req = db.requests.find((r) => r.id === requestId);
  check('T9c: IndexedDB — solicitação guarda códigos IATA e preço numérico',
    req?.originCode === 'AJU' && req?.destinationCode === 'GRU' && req?.targetPrice === 1250.5, JSON.stringify({ o: req?.originCode, d: req?.destinationCode, p: req?.targetPrice }));
  const qs = db.quotes.filter((q) => q.requestId === requestId);
  check('T9d: IndexedDB — 3 cotações com requestId da solicitação', qs.length === 3 && db.quotes.length === 3, `vinculadas=${qs.length}`);
  check('T9e: IndexedDB — horários reais gravados (não inventados)',
    qs.some((q) => q.airline === 'LATAM' && q.departureDateTime === '2027-02-15T08:00' && q.returnDepartureDateTime === '2027-02-22T18:00'));
  check('T9e2: cotações novas não gravam chegada (campo opcional vazio)', qs.every((q) => !q.arrivalDateTime && !q.returnArrivalDateTime));
  check('T9f: IndexedDB — a solicitação original NÃO foi alterada pela cotação divergente', req?.departureDate === '2027-02-15');
  check('T9g: IndexedDB — divergência registrada com justificativa',
    qs.some((q) => q.airline === 'Azul' && q.deviations?.length && /um dia depois/.test(q.deviationNote)));

  // ---------- Dados legados: chegada já gravada deve ser preservada ao editar ----------
  await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('AeroMonitorAI');
    open.onsuccess = () => {
      const d = open.result;
      const tx = d.transaction('quotes', 'readwrite');
      const st = tx.objectStore('quotes');
      st.getAll().onsuccess = (ev) => {
        const q = ev.target.result.find((x) => x.airline === 'LATAM');
        q.arrivalDateTime = '2027-02-15T11:00';
        q.returnArrivalDateTime = '2027-02-22T21:00';
        st.put(q);
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload();
  await page.getByText('Cotações vinculadas (3)').waitFor();
  check('T14a: cotação antiga mostra a chegada gravada', (await page.locator('body').innerText()).includes('15/02/2027 às 11:00'));
  await page.getByTitle('Editar').nth(0).click(); // 1ª cotação (LATAM, a mais antiga)
  await page.getByText('Editar Cotação').waitFor();
  check('T14b: edição abre com os dados da cotação', (await field('Companhia Aérea').inputValue()) === 'LATAM' && (await field('Horário de partida', 0).inputValue()) === '08:00');
  await field('Taxas').fill('60');
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();
  await page.getByText('Cotações vinculadas (3)').waitFor();
  await page.waitForTimeout(400);
  const db2 = await page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open('AeroMonitorAI');
    open.onsuccess = () => { const r = open.result.transaction('quotes').objectStore('quotes').getAll(); r.onsuccess = () => resolve(r.result); };
  }));
  const latam = db2.find((x) => x.airline === 'LATAM');
  check('T14c: editar mantém a chegada antiga gravada', latam?.arrivalDateTime === '2027-02-15T11:00' && latam?.returnArrivalDateTime === '2027-02-22T21:00');
  check('T14d: edição aplicou a alteração (taxas 60, total recalculado)', latam?.taxes === 60 && latam?.totalPrice === (600 + 60) * 2, JSON.stringify({ t: latam?.taxes, total: latam?.totalPrice }));

  // ---------- Cotações: seleção de solicitação existente ----------
  await page.goto(`${BASE}/cotacoes`);
  await page.getByRole('button', { name: /Registrar Cotação/ }).first().click();
  await page.getByText('Registrar Cotação').first().waitFor();
  const sel = field('Solicitação do Cliente');
  check('T10a: página Cotações lista as solicitações para vincular', (await sel.locator('option').count()) >= 2);
  await sel.selectOption(String(requestId));
  await page.waitForFunction(() => document.body.innerText.includes('Solicitação #'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const v10 = {
    origem: await field('Origem da oferta').inputValue(),
    ida: await field('Data de partida', 0).inputValue(),
    pax: await field('Passageiros').inputValue(),
  };
  check('T10b: escolher a solicitação preenche rota e datas',
    v10.origem === 'Aracaju (AJU)' && v10.ida === '2027-02-15' && v10.pax === '2', JSON.stringify(v10));
  await page.keyboard.press('Escape');

  // ---------- Não-regressão: Propostas e Monitoramento ----------
  await page.goto(`${BASE}/propostas`);
  const quoteSel = page.locator('select').nth(0);
  await page.waitForTimeout(500);
  const optValues = await page.locator('select option').allInnerTexts();
  const latamOpt = optValues.find((o) => o.includes('LATAM'));
  check('T11a: Propostas lista as cotações cadastradas', !!latamOpt, latamOpt);
  await page.locator('select').first().selectOption({ label: latamOpt });
  await page.waitForTimeout(300);
  const prev = await page.locator('pre').innerText();
  check('T11b: Propostas gera o texto com dados da cotação', prev.includes('LATAM') && prev.includes('Maria Teste E2E') && /1\.320,00/.test(prev));
  await page.goto(`${BASE}/monitoramento`);
  check('T11c: Monitoramento abre', await page.getByText('Novo Monitoramento').first().isVisible());

  // ---------- Pesquisa: seletor e URLs ----------
  await page.goto(`${BASE}/pesquisa`);
  await field('Origem').fill('Aracaju');
  await page.getByRole('option', { name: /\(AJU\)/ }).first().click();
  await field('Destino').fill('GRU');
  await page.getByRole('option', { name: /\(GRU\)/ }).first().click();
  await field('Data de Ida').fill('2027-02-15');
  await field('Data de Volta').fill('2027-02-22');
  // Não abre o site real (o Skyscanner usa CAPTCHA anti-bot e não devemos contorná-lo):
  // intercepta window.open e confere a URL que o app gerou.
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await page.getByRole('button', { name: /Pesquisar no Skyscanner/ }).click();
  const url = (await page.evaluate(() => window.__opened))[0] ?? '';
  console.log('   URL Skyscanner gerada pelo app:', url);
  check('T12: Skyscanner usa códigos IATA reais e data YYMMDD', /\/flights\/aju\/gru\/270215\/270222\//.test(url));
  await page.getByRole('button', { name: /Pesquisar no Google Flights/ }).click();
  const gurl = decodeURIComponent((await page.evaluate(() => window.__opened))[1] ?? '');
  console.log('   URL Google Flights gerada pelo app:', gurl);
  check('T12b: Google Flights usa os códigos AJU e GRU', /de AJU para GRU/.test(gurl));

  // ---------- Responsivo ----------
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/', '/solicitacoes', `/solicitacoes/${requestId}`, '/cotacoes', '/pesquisa']) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`T13: sem rolagem horizontal no celular (${path})`, overflow <= 1, `excesso=${overflow}px`);
  }
  await page.goto(`${BASE}/solicitacoes`);
  await page.getByRole('button', { name: /Nova Solicitação/ }).first().click();
  const mbox = await field('Preço Máximo Desejado').boundingBox();
  check('T13b: campo de preço utilizável no celular (>=150px)', mbox && mbox.width >= 150, `largura=${Math.round(mbox?.width ?? 0)}px`);
  await page.screenshot({ path: `${SHOTS}/06-mobile-form.png` });

  check('Sem erros de JavaScript na página', pageErrors.length === 0, pageErrors.join(' | '));
} catch (e) {
  check('Execução do roteiro E2E sem exceção', false, String(e).split('\n')[0]);
  await page.screenshot({ path: `${SHOTS}/erro.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nRESUMO: ${results.length - failed.length}/${results.length} verificações passaram`);
if (failed.length) { console.log('FALHAS:'); failed.forEach((r) => console.log(' -', r.name, r.detail)); }
process.exit(failed.length ? 1 : 0);
