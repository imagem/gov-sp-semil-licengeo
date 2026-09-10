import type { OperationProjection, PortfolioProjection } from "../../domain/model";

export type GeographicQuestionGroupId =
  | "process-map"
  | "evidence-data"
  | "agents-execution"
  | "rules-decisions";

export type GeographicQuestionId =
  | "restrictions"
  | "location"
  | "divergence"
  | "clear-checks"
  | "nearby-processes"
  | "data-nature"
  | "layers"
  | "data-quality"
  | "score-evidence"
  | "inconclusive"
  | "specialists"
  | "open-branches"
  | "saturation"
  | "shared-specialist"
  | "specialist-outputs"
  | "rules"
  | "score-composition"
  | "routing"
  | "human-decision"
  | "sla-risk"
  | "similar-cases"
  | "recent-events";

export interface GeographicQuestionGroup {
  readonly id: GeographicQuestionGroupId;
  readonly label: string;
  readonly description: string;
}

export interface GeographicQuestion {
  readonly id: GeographicQuestionId;
  readonly group: GeographicQuestionGroupId;
  readonly shortLabel: string;
  readonly prompt: string;
  readonly keywords: readonly string[];
}

export const GEOGRAPHIC_QUESTION_GROUPS = [
  { id: "process-map", label: "Processo e mapa", description: "Localização, restrições e relações territoriais" },
  { id: "evidence-data", label: "Evidências e dados", description: "Fontes, proveniência, qualidade e limites" },
  { id: "agents-execution", label: "Agentes e execução", description: "Especialistas, ramificações, carga e resultados" },
  { id: "rules-decisions", label: "Regras e portfólio", description: "Score, encaminhamento, decisão e SLA" },
] satisfies readonly GeographicQuestionGroup[];

export const GEOGRAPHIC_QUESTIONS = [
  question("restrictions", "process-map", "Restrições encontradas", "Quais restrições territoriais foram encontradas e qual área foi afetada?", ["restrição", "sobreposição", "interseção", "afetada"]),
  question("location", "process-map", "Localizar evidências", "Onde está cada evidência no mapa e qual geometria foi usada?", ["onde", "localização", "mapa", "geometria", "polígono"]),
  question("divergence", "process-map", "Comparar declaração", "O que mudou entre a declaração, a imagem e o resultado da análise?", ["mudou", "declaração", "imagem", "divergência"]),
  question("clear-checks", "process-map", "Verificações sem conflito", "Quais verificações terminaram sem encontrar conflito?", ["sem conflito", "verificações concluídas", "nenhuma restrição"]),
  question("nearby-processes", "process-map", "Processos próximos", "Quais processos em andamento estão próximos desta área?", ["processos próximos", "proximidade", "vizinhos"]),
  question("data-nature", "evidence-data", "Natureza dos dados", "Quais dados são fornecidos, sintéticos ou resultados simulados?", ["fornecido", "sintético", "simulado", "natureza"]),
  question("layers", "evidence-data", "Fontes e atualização", "Qual fonte sustenta cada evidência e quando ela foi atualizada?", ["camada", "camadas", "fonte", "fontes", "atualizada"]),
  question("data-quality", "evidence-data", "Qualidade insuficiente", "Há fonte ausente, desatualizada ou com qualidade insuficiente?", ["ausente", "desatualizada", "qualidade", "insuficiente"]),
  question("score-evidence", "evidence-data", "Evidência dominante", "Qual evidência mais contribuiu para o score e por quê?", ["contribuiu", "evidência", "score", "peso"]),
  question("inconclusive", "evidence-data", "Limites da conclusão", "O que ainda não pode ser concluído com os dados disponíveis?", ["não pode", "inconclusivo", "limite", "falta"]),
  question("specialists", "agents-execution", "Especialistas convocados", "Quais especialistas atuaram neste processo e por que foram convocados?", ["especialistas", "atuaram", "convocados"]),
  question("open-branches", "agents-execution", "Ramificações abertas", "Existe alguma ramificação aberta ou bloqueando a triagem?", ["ramificação", "bloqueando", "consulta aberta"]),
  question("saturation", "agents-execution", "Especialistas saturados", "Qual especialista está saturado e quais processos aguardam atendimento?", ["saturado", "saturação", "aguardam atendimento"]),
  question("shared-specialist", "agents-execution", "Atendimento simultâneo", "Dois processos estão usando o mesmo especialista agora?", ["mesmo especialista", "dois processos", "simultâneo"]),
  question("specialist-outputs", "agents-execution", "Últimas saídas", "Qual foi a última saída produzida por cada especialista?", ["última saída", "resultado do especialista", "produzida"]),
  question("rules", "rules-decisions", "Regras aplicadas", "Quais regras foram aplicadas, com quais limiares e versões?", ["regras", "limiares", "versão"]),
  question("score-composition", "rules-decisions", "Composição do score", "Como o score foi composto e o que mudaria a rota?", ["score", "composto", "mudaria a rota"]),
  question("routing", "rules-decisions", "Câmara e prazo", "Por que esta câmara e este prazo foram recomendados?", ["câmara", "prazo", "encaminhamento", "rota"]),
  question("human-decision", "rules-decisions", "Decisão humana", "O que exige decisão humana e qual é a próxima ação segura?", ["decisão humana", "próxima ação", "pendência"]),
  question("sla-risk", "rules-decisions", "Risco de SLA", "Quais processos apresentam risco de SLA ou dependência administrativa?", ["sla", "prazo", "dependência administrativa"]),
  question("similar-cases", "rules-decisions", "Casos similares", "Existem casos similares e quais diferenças impedem uma comparação direta?", ["similares", "comparação", "casos parecidos"]),
  question("recent-events", "rules-decisions", "Eventos recentes", "O que aconteceu nos últimos cinco minutos simulados?", ["últimos cinco minutos", "eventos recentes", "aconteceu"]),
] satisfies readonly GeographicQuestion[];

export function matchGeographicQuestion(input: string) {
  const normalizedInput = normalize(input);
  const exactMatch = GEOGRAPHIC_QUESTIONS.find(
    (question) => normalize(question.prompt) === normalizedInput,
  );
  if (exactMatch) return exactMatch;

  let bestMatch: GeographicQuestion | null = null;
  let bestScore = 0;
  let earliestMatch = Number.POSITIVE_INFINITY;

  for (const item of GEOGRAPHIC_QUESTIONS) {
    const matchedKeywords = item.keywords
      .map((keyword) => normalizedInput.indexOf(normalize(keyword)))
      .filter((index) => index >= 0);
    const score = matchedKeywords.length;
    const firstIndex = Math.min(...matchedKeywords, Number.POSITIVE_INFINITY);

    if (score > bestScore || (score === bestScore && firstIndex < earliestMatch)) {
      bestMatch = item;
      bestScore = score;
      earliestMatch = firstIndex;
    }
  }

  return bestMatch;
}

export function answerGeographicQuestion(
  questionId: GeographicQuestionId,
  projection: OperationProjection,
  portfolio?: PortfolioProjection,
) {
  const { scenario } = projection;
  const process = portfolio?.processes.find((item) => item.scenario.id === scenario.id);
  const branches = process?.branches ?? [];
  const activeBranches = branches.filter((branch) => branch.status === "active" || branch.status === "queued");
  const sources = [...new Set(projection.evidence.map((evidence) => evidence.source))];
  const sourceText = sources.length > 0 ? sources.join("; ") : "consultas ainda sem evidência publicada";
  const spatialEvidence = projection.evidence.filter((evidence) => evidence.kind === "spatial-overlap");

  switch (questionId) {
    case "restrictions":
      return response(
        spatialEvidence.length > 0
          ? `${spatialEvidence.length} evidência espacial foi registrada para ${scenario.id}: ${spatialEvidence.map((item) => `${item.title}, ${item.measure}`).join("; ")}.`
          : `A análise territorial de ${scenario.id} ainda não publicou restrição espacial.`,
        sourceText,
        projection.conflict ? `A evidência registrada abriu o conflito "${projection.conflict.summary}" e orienta a revisão.` : "Nenhum conflito foi produzido até este instante simulado.",
        "A demonstração não produz enquadramento legal oficial.",
        "Abrir as evidências do processo no mapa.",
      );
    case "location": {
      const [longitude, latitude] = scenario.center;
      return response(
        `${scenario.id} está em ${scenario.municipality}, próximo de ${latitude.toFixed(4)}, ${longitude.toFixed(4)}, com enquadramento cartográfico no zoom ${scenario.mapZoom}.`,
        `polígono sintético do cenário e ${scenario.focusLayerLabel}`,
        "O processo focado controla o enquadramento do mapa e o destaque das evidências já produzidas.",
        "As coordenadas e a geometria são demonstrativas e não representam imóvel ou empreendimento real.",
        "Centralizar o mapa no polígono e abrir a camada de foco.",
      );
    }
    case "divergence": {
      const divergence = projection.evidence.find((evidence) => evidence.kind === "attribute-divergence");
      return response(
        divergence ? `${divergence.title}: ${divergence.measure}. ${divergence.detail}.` : "Nenhuma divergência cadastral ou de imagem foi publicada até agora.",
        divergence?.source ?? sourceText,
        divergence ? "A divergência alimenta a consolidação de conformidade e pode abrir revisão humana." : "Sem evento produtor, a simulação não atribui efeito ao score.",
        "A imagem e os atributos comparados são sintéticos ou análogos ao real conforme a proveniência indicada.",
        "Abrir a evidência de divergência e comparar as geometrias.",
      );
    }
    case "clear-checks":
      return response(
        projection.completedStages.includes("territorial-analysis")
          ? `${scenario.stageSummaries["territorial-analysis"]}. As consultas sem evidência negativa permanecem registradas como verificações concluídas.`
          : "A bateria territorial ainda está em curso e não permite listar verificações negativas como concluídas.",
        `${scenario.focusLayerLabel} e diário do processo`,
        "Somente a conclusão da fase territorial autoriza apresentar ausência de conflito.",
        "A interface resume verificações negativas e não substitui o dossiê detalhado.",
        "Abrir o inspetor do processo para conferir cada verificação.",
      );
    case "nearby-processes": {
      const nearby = portfolio?.activeProcesses.filter((item) => item.scenario.id !== scenario.id).slice(0, 3) ?? [];
      return response(
        nearby.length > 0 ? `Há ${nearby.length} outros processos ativos no portfólio: ${nearby.map((item) => item.scenario.id).join(", ")}.` : "Não há outro processo ativo disponível para comparação neste instante.",
        "portfólio operacional simulado e centros dos cenários",
        "A comparação usa processos simultaneamente ativos e não presume relação administrativa entre eles.",
        "Proximidade visual não equivale a similaridade técnica ou jurídica.",
        "Abrir a página Processos e aplicar o filtro territorial.",
      );
    }
    case "data-nature": {
      const provided = projection.evidence.filter((item) => item.provenance === "provided-data").length;
      const synthetic = projection.evidence.filter((item) => item.provenance === "synthetic-data").length;
      const simulated = projection.evidence.filter((item) => item.provenance === "simulated-result").length;
      return response(
        `O processo expõe ${provided} evidência fornecida, ${synthetic} sintética e ${simulated} resultado simulado já publicados.`,
        sourceText,
        "Cada evidência preserva sua classificação e os resultados dependem dos eventos que já ocorreram.",
        "Contagens iguais a zero podem indicar que a fase produtora ainda não terminou.",
        "Abrir o catálogo de dados filtrado pelo processo.",
      );
    }
    case "layers":
      return response(
        sources.length > 0 ? `As fontes já registradas são ${sourceText}.` : "As fontes territoriais ainda estão em consulta e nenhuma evidência foi publicada.",
        `${scenario.focusLayerLabel}; datas preservadas em cada evidência`,
        "A fonte sustenta a evidência, que por sua vez alimenta conflito, score e encaminhamento.",
        "A data exibida é a data simulada ou fornecida no cenário, não uma consulta a serviço em tempo real.",
        "Abrir a proveniência no inspetor.",
      );
    case "data-quality": {
      const qualityBranch = branches.find((branch) => branch.specialistId === "ESP-04");
      return response(
        qualityBranch ? `${qualityBranch.title} está ${branchStatus(qualityBranch.status)}.` : "Nenhuma ocorrência de qualidade insuficiente foi aberta para o processo focado.",
        `${scenario.focusLayerLabel} e eventos do ESP-04`,
        qualityBranch ? "A fase territorial aguarda o resultado da curadoria antes de consolidar a recomendação." : "Sem gatilho de qualidade, o fluxo segue com as fontes previstas pelo cenário.",
        "A ausência de alerta não certifica qualidade institucional da fonte.",
        "Abrir Dados e regras para conferir vigência e proveniência.",
      );
    }
    case "score-evidence": {
      const mainEvidence = projection.evidence[0];
      return response(
        mainEvidence && projection.score !== null ? `${mainEvidence.title}, com medida ${mainEvidence.measure}, é a evidência territorial em destaque no score ${projection.score}/100.` : "O score ou suas evidências ainda não foram publicados.",
        mainEvidence?.source ?? sourceText,
        "A regra v2026.08 combina evidência territorial, integridade cadastral e complexidade técnica.",
        "Os pesos são parâmetros demonstrativos e não representam matriz oficial da CETESB.",
        "Abrir a regra aplicada e sua composição.",
      );
    }
    case "inconclusive":
      return response(
        activeBranches.length > 0 ? `Ainda faltam ${activeBranches.length} ramificações: ${activeBranches.map((branch) => branch.title).join("; ")}.` : "Não há dependência aberta registrada para o processo focado neste instante.",
        "diário de ramificações e fontes do processo",
        "Ramificações bloqueantes e consultivas precisam terminar antes da consolidação da fase de origem.",
        "Uma ramificação resolvida na simulação não equivale a manifestação institucional real.",
        "Abrir a orquestração e inspecionar as dependências.",
      );
    case "specialists":
      return response(
        branches.length > 0 ? `${branches.length} especialistas foram previstos para tarefas adicionais: ${branches.map((branch) => `${branch.specialistId} em ${branch.title}`).join("; ")}.` : "O processo segue o fluxo rápido sem convocação extraordinária.",
        "catálogo de especialistas e gatilhos do cenário",
        "Cada convocação parte de uma fase e devolve um resultado ao mesmo processo.",
        "Os especialistas são papéis digitais simulados, sem execução institucional ou integração externa.",
        "Abrir a página Agentes com o processo filtrado.",
      );
    case "open-branches":
      return response(
        activeBranches.length > 0 ? `${activeBranches.length} ramificações estão abertas: ${activeBranches.map((branch) => `${branch.title}, ${branchStatus(branch.status)}`).join("; ")}.` : "Nenhuma ramificação está aberta para o processo focado.",
        "eventos de solicitação, alocação, fila e resolução",
        "Uma dependência bloqueante segura apenas sua fase de origem; outros processos continuam.",
        "O tempo restante usa passos determinísticos da apresentação.",
        "Abrir a ramificação na orquestração.",
      );
    case "saturation": {
      const saturated = portfolio?.specialists.filter((item) => item.status === "saturated") ?? [];
      return response(
        saturated.length > 0 ? `${saturated.length} especialistas estão saturados: ${saturated.map((item) => `${item.specialist.id}, ${item.queuedAssignments.length} em espera`).join("; ")}.` : "Nenhum especialista está saturado neste instante simulado.",
        "projeção de ocupação derivada do diário do portfólio",
        "A capacidade preenchida mantém novas solicitações em espera sem bloquear o restante do portfólio.",
        "Capacidade e duração são parâmetros demonstrativos, não indicadores de equipe real.",
        "Abrir o grafo de agentes no modo Ao vivo.",
      );
    }
    case "shared-specialist": {
      const shared = portfolio?.specialists.filter((item) => item.activeAssignments.length >= 2) ?? [];
      return response(
        shared.length > 0 ? `${shared.map((item) => `${item.specialist.id} atende ${item.activeAssignments.map((assignment) => assignment.processId).join(" e ")}`).join("; ")}.` : "Nenhum especialista atende dois processos neste instante.",
        "alocações ativas do diário compartilhado",
        "O mesmo especialista recebe duas alocações somente quando sua capacidade declarada permite.",
        "A simultaneidade representa concorrência lógica no navegador, não execução distribuída real.",
        "Abrir a ocupação do especialista.",
      );
    }
    case "specialist-outputs": {
      const resolved = branches.filter((branch) => branch.status === "resolved");
      return response(
        resolved.length > 0 ? resolved.map((branch) => `${branch.specialistId}: ${branch.result}`).join(" ") : "Nenhuma saída especializada foi reincorporada ao processo até este instante.",
        "eventos de resolução das ramificações",
        "Cada saída volta à fase de origem e pode liberar a consolidação do processo.",
        "Saídas abertas não são antecipadas pelo assistente.",
        "Abrir o log da orquestração.",
      );
    }
    case "rules":
      return response(
        projection.recommendation ? `A regra demonstrativa v2026.08 produziu score ${projection.recommendation.score} e a rota ${projection.recommendation.route}.` : "A regra v2026.08 ainda não produziu recomendação para o processo focado.",
        `${sourceText}; regra v2026.08`,
        "As condições registradas relacionam evidências, limiares simulados, score e rota recomendada.",
        "A regra não representa enquadramento normativo oficial.",
        "Abrir Regras e inspecionar limiares e camadas.",
      );
    case "score-composition":
      return response(
        projection.score !== null ? `O score atual é ${projection.score}/100 e combina evidência territorial, integridade cadastral e complexidade técnica.` : "O score ainda não foi consolidado.",
        `${sourceText}; versão v2026.08`,
        "Mudanças em severidade, peso ou evidência podem alterar a rota em uma comparação isolada.",
        "A interface ainda não executou uma versão alternativa da regra para este processo.",
        "Abrir o laboratório e comparar uma cópia da regra.",
      );
    case "routing":
      return response(
        projection.recommendation ? `A rota é ${projection.recommendation.route}, com envio para ${projection.recommendation.chamber} e prazo ${formatDate(projection.recommendation.dueAt)}.` : "A câmara e o prazo ainda não foram publicados.",
        "score, aderência temática e capacidade simulada das câmaras",
        "O agente de encaminhamento usa a recomendação consolidada e o estado do portfólio.",
        "O prazo é demonstrativo e não representa compromisso institucional.",
        "Abrir o detalhe do encaminhamento.",
      );
    case "human-decision":
      return response(
        projection.status === "human-decision-required" ? "A triagem terminou e requer conferência humana das evidências e da recomendação." : `O processo está no estado ${projection.status} e ainda não abriu uma nova decisão humana.`,
        "eventos do processo, recomendação original e regra v2026.08",
        "Conflitos críticos ou conclusões automáticas encerradas alimentam a fila de trabalho humano.",
        "O assistente não aprova, rejeita ou altera a licença.",
        "Abrir Pendências e registrar uma justificativa.",
      );
    case "sla-risk": {
      const risks = portfolio?.processes.filter((item) => (item.recommendation?.score ?? 0) >= 55) ?? [];
      return response(
        risks.length > 0 ? `${risks.length} processos ativos ou em fila têm risco simulado elevado: ${risks.slice(0, 5).map((item) => item.scenario.id).join(", ")}.` : "Nenhum risco elevado de SLA está visível neste instante.",
        "scores dos cenários, estados do portfólio e prazos simulados",
        "Score elevado, espera administrativa e saturação aumentam a prioridade demonstrativa.",
        "O cálculo não usa histórico institucional ou previsão produtiva.",
        "Abrir Processos ordenado por risco de SLA.",
      );
    }
    case "similar-cases": {
      const similar = portfolio?.processes.filter((item) => item.scenario.id !== scenario.id && item.scenario.sector === scenario.sector).slice(0, 3) ?? [];
      return response(
        similar.length > 0 ? `Há ${similar.length} casos do setor ${scenario.sector}: ${similar.map((item) => item.scenario.id).join(", ")}.` : `Nenhum outro caso do setor ${scenario.sector} está no catálogo atual.`,
        "catálogo sintético de processos e atributos setoriais",
        "A similaridade inicial usa setor; evidências, município e restrições precisam ser comparados antes de qualquer analogia.",
        "Casos sintéticos não formam precedente técnico ou jurídico.",
        "Abrir a comparação detalhada de processos.",
      );
    }
    case "recent-events": {
      const recent = portfolio?.processes.flatMap((item) => item.events).filter((event) => event.tick >= (portfolio.tick - 100)).length ?? projection.events.length;
      return response(
        `${recent} eventos do portfólio ocorreram na janela dos últimos cinco minutos simulados. O processo focado possui ${projection.events.length} registros compatíveis com o painel atual.`,
        "diário único do portfólio e relógio simulado",
        "Recebimentos, fases, alocações, filas, evidências e conclusões atualizam todas as páginas pelo mesmo estado.",
        "A janela é baseada no relógio da apresentação, não no horário do computador.",
        "Abrir Auditoria com o filtro de cinco minutos.",
      );
    }
    default: {
      const exhaustive: never = questionId;
      return exhaustive;
    }
  }
}

function question(
  id: GeographicQuestionId,
  group: GeographicQuestionGroupId,
  shortLabel: string,
  prompt: string,
  keywords: readonly string[],
): GeographicQuestion {
  return { id, group, shortLabel, prompt, keywords };
}

function response(direct: string, source: string, causal: string, limit: string, action: string) {
  return `${direct}\n\nFonte: ${source}.\nRelação causal: ${causal}\nLimite: ${limit}\nPróxima ação: ${action}`;
}

function branchStatus(status: "waiting" | "queued" | "active" | "resolved") {
  switch (status) {
    case "waiting": return "aguardando a fase de origem";
    case "queued": return "na fila do especialista";
    case "active": return "em atividade";
    case "resolved": return "resolvida";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
