# Triagem didática e rastreável

Data: 30 de setembro de 2026

## Objetivo

Durante uma apresentação, o analista deve conseguir fixar uma pendência, entender por que ela existe, acompanhar o que cada fase consome e entrega, identificar qual componente produziu cada resultado e ver a relação entre o polígono e a decisão humana. A chegada de outros processos não deve interromper essa narrativa. A aplicação continua sendo uma simulação com dados e resultados demonstrativos.

## Escopo aprovado

### P0: foco, legibilidade e explicação

1. Ao clicar em uma pendência, o Centro de Controle fixa esse processo. A linha recebe destaque persistente e o rótulo "Foco fixado". Um comando explícito libera o foco. Novas pendências alteram a contagem e a fila, mas não o processo do inspetor, da orquestração, do assistente ou o enquadramento automático do mapa.
2. Enquanto o foco estiver fixado, alterações de fase, evidência ou camada podem mudar o destaque visual, mas não executam `goTo` para a extensão de outra camada ou processo. Comandos manuais de navegação do mapa continuam disponíveis. Ao liberar o foco, a seleção volta ao comportamento normal do portfólio.
3. A seleção fixada permanece após a triagem terminar e enquanto a pendência aguarda decisão. Após a deliberação, a aplicação remove o marcador de pendência; o processo pode continuar em foco até o apresentador liberá-lo ou escolher outro.
4. O bloco "Por que esta pendência?" aparece para o processo selecionado assim que houver solicitação de revisão humana. Ele mostra: fase ou especialista que produziu o achado, identificador e nome da regra demonstrativa, evidência concreta, motivo da revisão e próxima ação recomendada. Se um desses vínculos ainda não constar dos eventos, o bloco mostra "Aguardando registro" em vez de atribuir uma causa não observada.
5. A interface usa os termos "6 fases da triagem" para o fluxo sequencial e "especialistas digitais" para os 20 papéis disponíveis, agrupados em quatro áreas. Número, legenda e cor de cada área aparecem com texto, sem depender apenas da cor. Na explicação de um caso, apenas especialistas efetivamente convocados aparecem como participantes.
6. A revisão de legibilidade eleva os textos operacionais pequenos no Centro de Controle, sobretudo filas, inspetor, rótulos de gráficos, fases e log. Alvo: texto principal de pelo menos 12 px e metadados essenciais de pelo menos 11 px em tela de apresentação. Painéis podem crescer e rolar internamente para preservar conteúdo, sem truncar informação necessária.

### P1: entradas, saídas e trilha de decisão

1. O inspetor resume as seis fases com entrada, saída e estado atual. A seção detalhada da orquestração continua disponível. As saídas ainda não produzidas são indicadas como previstas, sem parecer resultados já calculados.
2. Histórico, log e dossiê distinguem fase sequencial, especialista convocado e analista humano. Para eventos de especialista, exibem ID, nome, fase de origem, gatilho registrado, resultado e estado. Para eventos de fase, exibem a fase responsável. Para decisões humanas, exibem o autor já registrado. Não se atribui um especialista a eventos da fase que não tenham essa relação no diário.
3. A página Processos recebe uma visão visual ligada ao Histórico: polígono do processo → evidência ou alerta → fase produtora → regra e especialista, quando houver → recomendação → decisão humana. Cada etapa abre o registro correspondente ou informa que ainda está pendente. A visualização reutiliza os eventos do processo e sua geometria, sem criar uma segunda fonte de verdade.
4. Cada processo com `pendingHumanWork(process) === true` tem um ícone de alerta sobre sua região no mapa. O ícone usa a posição do cenário e identifica o número do processo em texto acessível. O ícone desaparece quando `human-decision-recorded` encerra a pendência. Se uma solicitação de complemento levar a nova triagem e nova solicitação humana, o ícone reaparece. O polígono do processo fixado mantém destaque distinto dos demais alertas.

### P2: roteiro de apresentação

1. O caso guiado principal usa `PROC-2026-0514`, processo fictício de empreendimento turístico em Ibiúna. A evidência simulada é a interseção de 0,36 ha com a APA Itupararanga. A regra demonstrativa de UC de Uso Sustentável aciona revisão técnica. A fase territorial solicita `ESP-07` e `ESP-11`, conforme os ramos já definidos no cenário. O roteiro termina na revisão por analista, sem afirmar resultado jurídico ou licença concedida.
2. O roteiro inclui as três perguntas e respostas abaixo em um documento de apresentação. Elas servem como falas do apresentador; o mecanismo de correspondência e resposta do assistente permanece inalterado. Antes de o respectivo evento ocorrer, o apresentador diz "ainda não registrado" em vez de antecipar o resultado.
   - "Por que o PROC-2026-0514 virou pendência?" Resposta: "A triagem registrou uma interseção demonstrativa de 0,36 ha com a APA Itupararanga. A regra demonstrativa de UC de Uso Sustentável pede revisão técnica por analista."
   - "Quais especialistas foram convocados e por quê?" Resposta: "Na fase de análise territorial, o roteiro convocou ESP-07 para analisar a APA e ESP-11 para consultar a conectividade ecológica. O diário mostra a solicitação, o estado e o resultado de cada um."
   - "O que o analista faz agora?" Resposta: "Confere o polígono, a evidência, as fontes e os resultados dos especialistas; então registra a deliberação com justificativa ou solicita complemento. A recomendação simulada não substitui essa decisão."
3. Uma emergência química fica como variação narrativa sintética, em material de apresentação separado: um comunicado hipotético sobre vazamento em instalação industrial, com documentos de localização e descrição da ocorrência. O roteiro exemplifica recebimento, validação geométrica, consulta territorial e encaminhamento humano, sem atribuir regra ou especialista que o produto não tenha. Não entra como processo operacional novo nesta rodada, pois exigiria dados, agentes e regras que o catálogo atual não possui. O texto indica os dados hipotéticos e não afirma enquadramento legal.

## Modelo e fluxo de dados

- `PortfolioState` passa a guardar o ID do processo fixado, ou `null`. Selecionar outra pendência troca o foco fixado de forma explícita. Uma seleção explícita de outro processo na orquestração também troca o processo fixado; o comando "Liberar foco" remove a fixação. `advancePortfolio` só escolhe automaticamente outro processo quando não há foco fixado. A projeção selecionada, os painéis e o mapa derivam do mesmo ID.
- A explicação da pendência é uma projeção de leitura dos eventos atuais, das regras demonstrativas e dos ramos do cenário. Identificadores legíveis de regras, incluindo `R-03` para UC de Uso Sustentável, são definidos no catálogo de regras e rotulados como códigos internos da demonstração. Cada ramo de cenário registra um gatilho concreto, que é copiado para o evento `specialist-requested`. O vínculo com a evidência e a regra é definido nos dados do cenário. Ausência de vínculo gera um estado incompleto visível, nunca uma atribuição por semelhança de texto.
- O mapa recebe a lista de pendências da projeção do portfólio. A camada de alertas é atualizada quando a lista muda. Mudanças de estado não recriam o mapa. O enquadramento automático considera o processo fixado antes de considerar camadas e animações.
- Uma função compartilhada transforma os eventos de cada processo em uma trilha de apresentação. Inspetor, Histórico, Processos e dossiê usam essa trilha para nomes, sequência, autoria e disponibilidade dos vínculos.
- Os dados do roteiro e as três perguntas usam o processo real da simulação no momento da resposta. Se a evidência ou a convocação ainda não ocorreu, o texto usa "ainda não registrado". O conteúdo não antecipa resultados futuros.

## Componentes afetados

- Estado e projeções: `domain/model.ts`, `domain/portfolio.ts`, `app/use-scenario.ts`, `app/work-queues.ts` e um módulo de leitura da trilha e explicação.
- Centro de Controle: `App.tsx`, `HumanWorkPanel.tsx`, `ProcessInspector.tsx`, `AgentWorkbench.tsx`, `OperationMap.tsx` e estilos.
- Processo e registros: `ProcessWorkspace.tsx`, `AuditWorkspace.tsx`, `DossierDialog.tsx` e conteúdo do roteiro.
- Catálogos: `operation-data.ts` para códigos de regras demonstrativas e `operation-scenarios.ts` para gatilhos e vínculos explícitos de cada ramo.

## Estados e falhas

- Antes de `human-decision-requested`, o painel explica que a triagem ainda não abriu revisão humana.
- Evidência sem regra identificável mantém a evidência visível e sinaliza vínculo ausente. Regra sem especialista convocado mostra a fase responsável, sem inventar uma convocação.
- Se as camadas externas do mapa falharem, a lista textual das pendências e a trilha do processo continuam disponíveis.
- Se o processo fixado sair do catálogo por alguma mudança futura, a aplicação libera o foco e seleciona um processo disponível.
- O foco fixado é estado da sessão de demonstração, sem persistência entre recargas.

## Verificação

1. Fixar `PROC-2026-0514`, avançar a simulação até outras chegadas e confirmar que fila e contadores mudam sem alterar seleção, assistente ou enquadramento automático do mapa.
2. Confirmar que cada pendência gera um alerta no mapa, que uma decisão registrada o remove e que uma nova solicitação humana após complemento o restaura.
3. Conferir que a explicação de `PROC-2026-0514` mostra a evidência de 0,36 ha, a regra demonstrativa de UC de Uso Sustentável, a fase territorial, os especialistas realmente convocados e a ação de revisão técnica.
4. Conferir que os eventos nas visões de Processos, Histórico, log e dossiê mantêm a mesma autoria e ordem, inclusive quando ainda não há evidência ou especialista.
5. Testar typecheck e build. Fazer revisão visual em largura de apresentação e em tela estreita para legibilidade, rolagem, contraste, foco de teclado e leitura dos ícones.

## Limites

Os códigos de regra e os resultados são internos à demonstração. Eles não representam regra legal oficial. A rodada não altera a lógica central de resposta do assistente, não cria integração externa e não adiciona um caso químico à execução da triagem.
