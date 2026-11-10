# AeroMonitor AI ✈️

**Aplicação web para organizar solicitações de passagens aéreas, registrar cotações, comparar ofertas e preparar propostas comerciais.**

> **Status:** protótipo funcional em desenvolvimento (v1). A pesquisa de preços é semiautomática e os dados são armazenados localmente no navegador.

## O problema que o projeto aborda

Na rotina de uma agência de viagens, informações sobre clientes, datas, rotas, preços e propostas podem ficar dispersas. O AeroMonitor AI reúne esse fluxo em uma interface: da solicitação inicial à apresentação de uma cotação.

## Funcionalidades

- **Clientes:** cadastro e consulta de informações.
- **Solicitações:** registro de origem, destino, datas, passageiros, bagagem e orçamento.
- **Pesquisa centralizada:** abertura de consultas no Google Flights e Skyscanner; apoio à pesquisa manual em sites de companhias aéreas. **Não coleta preços automaticamente.**
- **Cotações:** cadastro de ofertas, cálculo de valores e associação às solicitações, com preenchimento inicial de dados conhecidos.
- **Comparação:** destaque de ofertas comparáveis e avisos sobre divergências entre solicitação e cotação.
- **Monitoramento:** organização de acompanhamentos e registros de preços. **Não é um serviço de alertas automáticos em tempo real.**
- **Propostas:** criação de mensagens para WhatsApp e exportação em PDF.
- **Dados e backup:** exportação e restauração de registros em JSON.

## Tecnologias

| Área | Tecnologias |
| --- | --- |
| Interface | React, TypeScript, Vite, Tailwind CSS |
| Estado e navegação | Zustand, React Router |
| Persistência | IndexedDB, Dexie.js |
| Visualizações e PDF | Recharts, jsPDF |
| Testes | Vitest, Playwright Core (roteiro E2E) |
| Qualidade | TypeScript, Oxlint |

## Como executar localmente

**Pré-requisito:** Node.js e npm compatíveis com as dependências descritas em `package.json`.

```bash
git clone https://github.com/lucaalima201-create/Aeromonitor-v1.git
cd Aeromonitor-v1
npm ci
npm run dev
```

Abra o endereço local informado pelo Vite (normalmente `http://localhost:5173`).

**Windows / PowerShell:** se a política de execução bloquear o `npm.ps1`, use `npm.cmd ci` e `npm.cmd run dev`.

### Verificações

```bash
npm test
npm run lint
npm run build
```

O roteiro E2E pode ser iniciado com `npm run e2e`, depois de iniciar o servidor de desenvolvimento. Atualmente ele depende do Microsoft Edge instalado no caminho indicado em `e2e/flow.mjs`.

O relatório de desenvolvimento em [PROGRESSO.md](PROGRESSO.md) registra **46 testes unitários e 61 verificações E2E aprovadas** na última rodada documentada (09/11/2026). Esses números são históricos; não representam uma execução automática a cada commit.

## Como o sistema funciona

1. Cadastre um cliente e crie uma solicitação de viagem.
2. Utilize a pesquisa centralizada para abrir fontes externas e consultar opções.
3. Registre manualmente as ofertas encontradas e compare cotações vinculadas à solicitação.
4. Prepare a proposta para o cliente e exporte em PDF ou encaminhe pelo WhatsApp.
5. Acompanhe os registros de preço e faça backups periódicos.

## Arquitetura e armazenamento

O projeto é uma aplicação web client-side. A persistência utiliza **IndexedDB**, por meio do **Dexie.js**. Não há, nesta versão, backend próprio para sincronização de clientes e cotações entre dispositivos.

**Atenção à privacidade:** não utilize dados reais de clientes em demonstrações públicas. Backups JSON podem conter informações pessoais e não devem ser adicionados ao repositório. Limpar os dados do navegador pode apagar as informações locais; mantenha backups protegidos.

## Limitações atuais

- Tarifas e disponibilidade devem ser verificadas diretamente nas fontes externas antes da emissão.
- Links de busca podem mudar ou exigir verificação anti-bot; não há integração oficial de preços em tempo real.
- Dados locais não são sincronizados entre computadores ou navegadores.
- O projeto não inclui, nesta versão, um módulo comprovado de IA generativa ou previsão de preços.
- A interface foi testada em navegador automatizado, mas ainda precisa de validação ampliada em dispositivos e navegadores reais.

## Evoluções planejadas

- Melhorias de usabilidade, filtros e formulários de cotação.
- Demonstração pública com dados fictícios.
- Testes de integração contínua e compatibilidade entre navegadores.
- Avaliação de uma arquitetura com backend e autenticação, caso o produto evolua para uso multiusuário.
- Estudo de integrações autorizadas para dados de preços e alertas.

## Demonstração visual

Capturas de tela com **dados fictícios** serão adicionadas aqui. Uma versão hospedada poderá ser disponibilizada após revisão de privacidade e testes.

---

**Projeto de portfólio em desenvolvimento.** Para histórico técnico, decisões e limitações, consulte [PROGRESSO.md](PROGRESSO.md).
