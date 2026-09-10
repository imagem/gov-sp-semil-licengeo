import { OPERATION_SCENARIOS } from "./operation-scenarios";
import { currentExecutionEvents, workflowFor } from "../domain/workflow";
import type { AgentStage, ProcessExecutionProjection } from "../domain/model";

export const PHASES: readonly AgentStage[] = [
  "receiving",
  "geometry",
  "territorial-analysis",
  "conformity",
  "routing",
  "opinion",
];
export const PHASE_NAMES = [
  "Recebimento",
  "Geometria",
  "Territorial",
  "Conformidade",
  "Encaminhamento",
  "Parecer",
];
const REPRESENTATIVES = [
  "Marina Costa",
  "Rafael Lima",
  "Beatriz Santos",
  "Gustavo Rocha",
  "Helena Alves",
  "Lucas Ferreira",
  "Juliana Mendes",
  "Pedro Castro",
  "Camila Nunes",
  "Felipe Dias",
  "Sofia Martins",
  "André Barros",
  "Luiza Pereira",
  "Daniel Gomes",
  "Clara Oliveira",
];
export const CHAMBERS = [
  ...new Set(
    OPERATION_SCENARIOS.map((scenario) => scenario.recommendation.chamber),
  ),
];
export function peopleFor(process: ProcessExecutionProjection) {
  const index = OPERATION_SCENARIOS.findIndex(
    (scenario) => scenario.id === process.scenario.id,
  );
  return {
    representative: REPRESENTATIVES[index] ?? "Representante simulado",
    professional:
      REPRESENTATIVES[(index + 5) % REPRESENTATIVES.length] ??
      "Responsável técnico simulado",
  };
}
export function documentsFor(process: ProcessExecutionProjection) {
  const workflow = workflowFor(process);
  const assessed = process.completedStages.includes("receiving");
  return [
    "Requerimento",
    "Memorial descritivo",
    "Geometria do empreendimento",
    "Declaração ambiental",
  ].map((title, index) => {
    const id = "DOC-" + (index + 1);
    const replaced = workflow.replaced.has(id);
    const missing = workflow.missing.includes(id);
    const values: readonly (number | null)[] =
      !assessed && !replaced
        ? [null, null, null, null]
        : [
            missing ? 0 : 100,
            100,
            100,
            replaced || !process.conflict || index !== 3 ? 100 : 50,
          ];
    return {
      id,
      title,
      values,
      score: values.every((value) => value !== null)
        ? Math.round(
            values.reduce<number>((total, value) => total + (value ?? 0), 0) /
              4,
          )
        : null,
      state: missing
        ? "Complemento solicitado"
        : replaced
          ? "Nova versão recebida"
          : !assessed
            ? "Não avaliado"
            : values.includes(50)
              ? "Divergência identificada"
              : "Verificado",
      version: 1 + process.events.filter((event) => event.kind === "workflow-action" && event.action.kind === "receive-documents" && event.action.documentIds.includes(id)).length,
      missing,
    };
  });
}
export function processLabel(process: ProcessExecutionProjection) {
  if (workflowFor(process).missing.length) return "Aguardando complemento";
  const lastDecision = [...process.events]
    .reverse()
    .find(
      (event) =>
        event.kind === "human-decision-recorded" ||
        (event.kind === "workflow-action" &&
          event.action.kind === "receive-documents"),
    );
  if (
    currentExecutionEvents(process.events).some(
      (event) => event.kind === "dossier-issued",
    )
  )
    return "Parecer emitido";
  if (lastDecision?.kind === "human-decision-recorded")
    return lastDecision.decision.kind === "request-complement"
      ? "Aguardando complemento"
      : "Pronto para emissão";
  return process.status === "queued"
    ? "Aguardando entrada"
    : process.status === "triage-completed"
      ? "Revisão humana"
      : (PHASE_NAMES[
          PHASES.findIndex((stage) => stage === process.currentStage)
        ] ?? "Em triagem");
}
export function timeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}
