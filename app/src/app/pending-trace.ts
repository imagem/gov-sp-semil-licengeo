import type { PortfolioEvent, ProcessExecutionProjection } from "../domain/model";

type Rule = { readonly id: string; readonly code: string; readonly title: string };
type Specialist = { readonly id: string; readonly name: string };

export function pendingExplanation(
  process: Pick<ProcessExecutionProjection, "scenario" | "evidence" | "events">,
  rules: readonly Rule[],
  specialists: readonly Specialist[],
) {
  const events = currentCycleEvents(process.events);
  const requested = events.some((event) => event.kind === "human-decision-requested");
  const latestRecommendation = [...events].reverse().find((event) => event.kind === "recommendation-created");
  const ruleId = process.scenario.focusLayer === "none"
    ? latestRecommendation?.kind === "recommendation-created" && latestRecommendation.recommendation.score >= 35 ? "score" : null
    : process.scenario.focusLayer;
  const rule = rules.find((item) => item.id === ruleId);
  const reviewRule = requested ? rules.find((item) => item.id === "humanReview") : undefined;
  const evidence = process.evidence[0];
  const requests = events.filter((event): event is Extract<PortfolioEvent, { kind: "specialist-requested" }> => event.kind === "specialist-requested");
  return {
    requested,
    ruleCode: rule?.code ?? reviewRule?.code ?? "Aguardando registro",
    ruleTitle: rule?.title ?? reviewRule?.title ?? "Aguardando registro",
    evidence: evidence ? `${evidence.title}: ${evidence.measure}. ${evidence.detail}` : "Aguardando registro",
    reason: requested && process.scenario.focusLayer === "none" && process.scenario.conflict === null && process.scenario.recommendation.score < 35
      ? "As camadas exibidas não indicam sobreposição. A revisão humana de rotina confere a documentação antes do encaminhamento."
      : requested && evidence?.kind === "spatial-overlap"
      ? "O cruzamento gerou um alerta de triagem para revisão técnica. A interseção, isoladamente, não comprova irregularidade."
      : requested && evidence
        ? "A evidência registrada gerou uma pendência de triagem. O analista deve conferir a fonte e a documentação antes de decidir."
      : requested ? "A triagem foi concluída e aguarda conferência humana antes do encaminhamento." : "A triagem ainda não solicitou revisão humana.",
    action: process.scenario.recommendation.route,
    producer: evidence ? "Fase 3 · Análise territorial automatizada" : "Aguardando registro",
    specialists: requests.map((event) => {
      const resolution = events.find((item) => item.kind === "branch-resolved" && item.requestId === event.requestId);
      return {
      id: event.specialistId,
      name: specialists.find((item) => item.id === event.specialistId)?.name ?? "Especialista digital",
      trigger: event.trigger,
      result: resolution?.kind === "branch-resolved" ? resolution.result : "Aguardando resultado",
    }; }),
  };
}

export function eventAttribution(event: PortfolioEvent, specialists: readonly Specialist[]): string {
  if (event.kind === "workflow-action") return `${event.author} · analista humano`;
  if (event.kind === "human-decision-recorded") return `${event.decision.author} · analista humano`;
  if (event.kind === "dossier-issued") return `${event.dossier.issuedBy} · analista humano`;
  if ("specialistId" in event) {
    const name = specialists.find((item) => item.id === event.specialistId)?.name ?? "Especialista digital";
    return `${event.specialistId} · ${name}`;
  }
  if (event.kind === "stage-started" || event.kind === "stage-completed") return `Fase ${stageNumber(event.stage)} · triagem digital`;
  if (event.kind === "evidence-recorded" || event.kind === "conflict-detected") return "Fase 3 · Análise territorial";
  return "Orquestração digital";
}

export function processTraceSteps(
  process: Pick<ProcessExecutionProjection, "scenario" | "evidence" | "events">,
  rules: readonly Rule[],
  specialists: readonly Specialist[],
) {
  const explanation = pendingExplanation(process, rules, specialists);
  const events = currentCycleEvents(process.events);
  const recommendation = [...events].reverse().find((event) => event.kind === "recommendation-created");
  const decision = [...events].reverse().find((event) => event.kind === "human-decision-recorded");
  return [
    { label: "Polígono", value: `${process.scenario.id} · ${process.scenario.municipality}`, eventKind: "process-received" as const },
    { label: "Evidência registrada", value: explanation.evidence === "Aguardando registro" ? "Ainda não registrado" : explanation.evidence, eventKind: "evidence-recorded" as const },
    { label: "Fase produtora", value: explanation.producer === "Aguardando registro" ? "Ainda não registrado" : explanation.producer, eventKind: "stage-completed" as const },
    { label: "Regra e agente", value: explanation.ruleCode === "Aguardando registro" ? "Ainda não registrado" : `${explanation.ruleCode} · ${explanation.ruleTitle}${explanation.specialists.length ? ` · ${explanation.specialists.map((item) => `${item.id} ${item.name}`).join("; ")}` : " · Sem especialista convocado"}`, eventKind: explanation.specialists.length ? "specialist-requested" as const : "human-decision-requested" as const },
    { label: "Recomendação", value: recommendation?.kind === "recommendation-created" ? recommendation.recommendation.route : "Ainda não registrado", eventKind: "recommendation-created" as const },
    { label: "Decisão humana", value: decision?.kind === "human-decision-recorded" ? `${decision.decision.author}: ${decision.decision.justification}` : "Ainda não registrado", eventKind: "human-decision-recorded" as const },
  ];
}

function stageNumber(stage: string) {
  return ["receiving", "geometry", "territorial-analysis", "conformity", "routing", "opinion"].indexOf(stage) + 1;
}

function currentCycleEvents(events: readonly PortfolioEvent[]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.kind === "workflow-action" && event.action.kind === "receive-documents") return events.slice(index + 1);
  }
  return events;
}
