# Triagem didática e rastreável Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter uma pendência em evidência durante a simulação e tornar verificável o caminho entre polígono, alerta, fase, especialista, regra e decisão humana.

**Architecture:** O diário do portfólio continua sendo a fonte de verdade. Uma fixação explícita controla a seleção, enquanto projeções de leitura compõem a explicação e a trilha visual. Os componentes do mapa e dos painéis consomem essas projeções sem duplicar decisões ou antecipar eventos.

**Tech Stack:** React 19, TypeScript 7, Vite 8, ArcGIS Maps SDK 5, CSS, testes com `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-30-triagem-didatica-design.md`

## Global Constraints

- Dados, resultados e códigos de regra são demonstrativos, sem interpretação legal oficial.
- O assistente conserva o mecanismo atual de correspondência e resposta.
- O caso principal é `PROC-2026-0514`; a emergência química é somente um roteiro narrativo sintético.
- Texto principal operacional em tela de apresentação: pelo menos 12 px. Metadados essenciais: pelo menos 11 px.
- O diretório fornecido não contém `.git`; passos de commit ficam suspensos até existir um repositório.

## Review Focus

- Chegada de outro processo enquanto `PROC-2026-0514` está fixado: fila atualiza, foco e mapa permanecem.
- Seleção fixada após concluir a triagem: o processo continua visível enquanto aguarda decisão.
- Complemento seguido de nova triagem: alerta some após a primeira deliberação e retorna apenas com nova solicitação humana.
- Evento sem vínculo explícito com regra ou especialista: a interface informa ausência de registro, sem atribuição inferida.
- Falha das camadas externas do mapa: pendências e trilha textual seguem utilizáveis.

---

## Estrutura de arquivos

- `app/src/domain/focus-selection.ts`: regra pura da seleção automática e fixada.
- `app/src/domain/portfolio.ts`, `app/src/domain/model.ts`, `app/src/app/use-scenario.ts`: estado de fixação e comandos.
- `app/src/app/pending-trace.ts`: leitura única da explicação e da trilha por processo, com vínculos explícitos.
- `app/src/app/operation-data.ts`, `app/src/app/operation-scenarios.ts`: códigos internos de regra e gatilhos específicos.
- `app/src/components/operation/*`, `app/src/components/map/OperationMap.tsx`, `app/src/components/modules/*`, `app/src/components/dialogs/DossierDialog.tsx`: apresentação das projeções.
- `app/src/styles/app.css`, `app/src/styles/workspace.css`: legibilidade e novos estados visuais.
- `docs/demo-roteiro.md`: caso guiado, três perguntas e variação química hipotética.

### Task 1: Fixação da pendência e seleção consistente

**Files:** Create `app/src/domain/focus-selection.ts`, `tests/focus-selection.test.ts`; modify `app/src/domain/model.ts`, `app/src/domain/portfolio.ts`, `app/src/app/use-scenario.ts`, `app/src/App.tsx`, `app/src/components/operation/HumanWorkPanel.tsx`, `app/src/components/operation/human-work-selection.ts`.

**Interfaces:** `PortfolioState.pinnedProcessId: string | null`; `pinPortfolioProcess(state, processId): PortfolioState`; `releasePortfolioProcess(state): PortfolioState`; `resolvePortfolioSelection(pinnedId, selectedId, activeIds, firstArrivalId): string | null`. O hook expõe `pinProcess`, `releaseProcess` e `pinnedProcessId`.

- [ ] Escrever testes de `resolvePortfolioSelection`: chegada não troca ID fixado; término da triagem não troca ID fixado; sem fixação segue processo ativo; ID fixado ausente libera para fallback.
- [ ] Rodar `node --experimental-strip-types --test tests/focus-selection.test.ts`; confirmar falha antes da implementação.
- [ ] Implementar a função pura, propagar o campo pelo estado e usar a função em `advancePortfolio`; fazer seleção de pendência fixar o ID e o comando de liberação removê-lo.
- [ ] Mostrar `Foco fixado` e `Liberar foco` na linha e no detalhe; seleção explícita de outro processo troca a fixação.
- [ ] Rodar o teste, `npm run typecheck` e `npm run build`; confirmar aprovação.

### Task 2: Enquadramento estável e alertas de pendência no mapa

**Files:** Modify `app/src/App.tsx`, `app/src/components/map/OperationMap.tsx`; create `app/src/components/map/pending-markers.ts`, `tests/pending-markers.test.ts`; modify `app/src/styles/app.css`.

**Interfaces:** `OperationMap` recebe `pinnedProcessId: string | null` e `pendingProcesses: readonly ProcessExecutionProjection[]`; `pendingMarkerSpecs(processes)` devolve IDs, centros e rótulos acessíveis dos processos que ainda aguardam decisão.

- [ ] Escrever testes de `pendingMarkerSpecs`: dois processos pendentes geram dois marcadores; processo deliberado sai; nova solicitação humana após complemento volta à lista.
- [ ] Rodar o teste e confirmar falha.
- [ ] Adicionar camada de alertas ao registro do ArcGIS e atualizá-la quando `pendingProcesses` mudar; manter o destaque do polígono selecionado acima dos alertas.
- [ ] Suprimir `goTo` automático para extensão de camada ou outro processo enquanto houver fixação; preservar os controles manuais e a mensagem de falha do mapa.
- [ ] Rodar teste, typecheck e build; verificar visualmente marcadores e enquadramento após a chegada de novos processos.

### Task 3: Explicação da pendência e autoria dos eventos

**Files:** Create `app/src/app/pending-trace.ts`, `tests/pending-trace.test.ts`; modify `app/src/domain/model.ts`, `app/src/domain/portfolio.ts`, `app/src/app/operation-data.ts`, `app/src/app/operation-scenarios.ts`, `app/src/components/operation/HumanWorkPanel.tsx`, `app/src/components/operation/AgentWorkbench.tsx`, `app/src/components/modules/AuditWorkspace.tsx`.

**Interfaces:** `BranchRequestTemplate.trigger: string`; evento `specialist-requested.trigger: string`; `pendingExplanation(process, rules, specialists)` devolve regra, evidência, agente ou fase, motivo e ação com estado de disponibilidade; `eventAttribution(event, process, specialists)` devolve autoria exibível sem inferir um especialista não convocado. Os catálogos são argumentos para que o módulo de leitura tenha testes diretos sem carregar a interface.

- [ ] Escrever testes: `PROC-2026-0514` usa regra interna `R-03`, evidência de `0,36 ha` e `ESP-07`/`ESP-11` somente após solicitação; evento sem vínculo mostra `Aguardando registro`; decisão humana mostra o autor registrado.
- [ ] Rodar `node --experimental-strip-types --test tests/pending-trace.test.ts` e confirmar falha.
- [ ] Registrar códigos internos no catálogo de regras e gatilhos concretos nos ramos; copiar o gatilho para o evento criado pelo portfólio.
- [ ] Implementar a projeção de explicação e autoria a partir dos eventos atuais; exibir `Por que esta pendência?` e autoria no log e no Histórico.
- [ ] Rodar o teste, typecheck e build; comparar os três painéis para o mesmo evento.

### Task 4: Seis fases, grupos de especialistas e entradas e saídas

**Files:** Modify `app/src/components/operation/AgentWorkbench.tsx`, `app/src/components/operation/ProcessInspector.tsx`, `app/src/components/modules/SpecialistNetwork.tsx`, `app/src/styles/app.css`, `app/src/styles/workspace.css`.

**Interfaces:** Usa `AGENTS` para as seis fases e `SPECIALISTS` para os 20 especialistas em quatro grupos. A lista resumida do inspetor distingue saídas publicadas de saídas previstas.

- [ ] Fazer uma revisão visual inicial em largura de apresentação e tela estreita, anotando textos truncados e informações abaixo de 11 px.
- [ ] Rotular explicitamente `6 fases da triagem` e `20 especialistas digitais em 4 áreas`; usar cor com legenda textual para cada área.
- [ ] Inserir no inspetor a sequência entrada → saída → estado por fase; identificar resultados futuros como previstos.
- [ ] Ajustar largura, altura e rolagem dos painéis; elevar tipografia operacional aos limites da especificação sem esconder etapas.
- [ ] Rodar typecheck e build; repetir a inspeção visual e conferir foco de teclado e leitura sem depender de cor.

### Task 5: Cadeia visual em Processos e dossiê

**Files:** Modify `app/src/components/modules/ProcessWorkspace.tsx`, `app/src/components/dialogs/DossierDialog.tsx`, `app/src/components/modules/AuditWorkspace.tsx`, `app/src/styles/workspace.css`; create `app/src/components/modules/ProcessTrace.tsx`.

**Interfaces:** `ProcessTrace` recebe `process: ProcessExecutionProjection` e a trilha de `pending-trace.ts`; cada etapa identifica evento associado ou `Ainda não registrado`. O dossiê usa a mesma atribuição para fase, especialista, regra e decisão humana.

- [ ] Criar verificação com um processo em triagem e outro deliberado: cadeia parcial não apresenta saídas futuras; cadeia concluída aponta os mesmos eventos do Histórico.
- [ ] Construir a aba visual em Processos na ordem polígono → alerta → fase → regra/especialista → recomendação → decisão; ativar navegação para os registros existentes.
- [ ] Incluir autoria e gatilho no dossiê sem antecipar conclusões.
- [ ] Rodar typecheck e build; conferir a cadeia e o Histórico lado a lado nos dois estados.

### Task 6: Roteiro de apresentação e revisão final

**Files:** Create `docs/demo-roteiro.md`; modify `app/src/styles/app.css` e arquivos de interface apenas se a revisão encontrar lacunas concretas.

**Interfaces:** Documento usa o caso `PROC-2026-0514` e reproduz literalmente as três perguntas e respostas da especificação. A variação química é uma narrativa hipotética, sem processo operacional, regra ou agente novos.

- [ ] Escrever o roteiro com sequência de apresentação, três perguntas, respostas condicionadas aos eventos já registrados e variação química rotulada como hipotética.
- [ ] Rodar `npm run typecheck` e `npm run build`; executar os testes de Node da rodada.
- [ ] Percorrer o fluxo completo em navegador: fixar, observar novas chegadas, abrir explicação e Histórico, conferir marcadores, deliberar e liberar foco.
- [ ] Registrar no relato final os resultados da verificação e qualquer limitação observada. Commits permanecem indisponíveis neste diretório sem `.git`.
