import type {
  PortfolioEvent,
  PortfolioState,
  ProcessExecutionProjection,
} from "./model";
import { publishedRule } from "./rule-comparison";

export const ANALYSTS = [
  "Ana Souza",
  "Bruno Martins",
  "Carla Ribeiro",
  "Diego Almeida",
];
export const CURRENT_ANALYST = "Ana Souza";
export type WorkflowAction =
  | {
      readonly kind: "assign";
      readonly analyst: string;
      readonly chamber: string;
    }
  | {
      readonly kind: "request-documents";
      readonly documentIds: readonly string[];
    }
  | {
      readonly kind: "receive-documents";
      readonly documentIds: readonly string[];
    }
  | {
      readonly kind: "publish-rule";
      readonly ruleId: string;
      readonly weight: number;
      readonly threshold: number;
      readonly version: number;
    };

export function workflowFor(process: ProcessExecutionProjection) {
  let analyst = "";
  let chamber = "";
  let missing: readonly string[] = [];
  const replaced = new Set<string>();
  for (const event of process.events) {
    if (event.kind !== "workflow-action") continue;
    if (event.action.kind === "assign") {
      analyst = event.action.analyst;
      chamber = event.action.chamber;
    }
    if (event.action.kind === "request-documents")
      missing = [...new Set([...missing, ...event.action.documentIds])];
    if (event.action.kind === "receive-documents") {
      const ids = event.action.documentIds;
      missing = missing.filter((id) => !ids.includes(id));
      ids.forEach((id) => replaced.add(id));
    }
  }
  return { analyst, chamber, missing, replaced };
}

export function currentExecutionEvents(events: readonly PortfolioEvent[]) {
  const restart = new Map<string, number>();
  events.forEach((event, index) => {
    if (
      event.kind === "workflow-action" &&
      event.action.kind === "receive-documents"
    )
      restart.set(event.processId, index);
  });
  return events.filter(
    (event, index) => index > (restart.get(event.processId) ?? -1),
  );
}

export function recordWorkflow(
  state: PortfolioState,
  process: ProcessExecutionProjection,
  action: WorkflowAction,
  reason: string,
): PortfolioState {
  if (!reason.trim()) return state;
  const previous = workflowFor(process);
  if (
    (action.kind === "request-documents" ||
      action.kind === "receive-documents") &&
    action.documentIds.some(
      (id) => !["DOC-1", "DOC-2", "DOC-3", "DOC-4"].includes(id),
    )
  )
    return state;
  if (
    action.kind === "assign" &&
    (!ANALYSTS.includes(action.analyst) ||
      (!process.recommendation && action.chamber))
  )
    return state;
  if (
    action.kind === "request-documents" &&
    (!action.documentIds.length ||
      action.documentIds.every((id) => previous.missing.includes(id)))
  )
    return state;
  if (
    action.kind === "receive-documents" &&
    (!action.documentIds.length ||
      action.documentIds.some((id) => !previous.missing.includes(id)))
  )
    return state;
  if (
    action.kind === "publish-rule" &&
    (!Number.isFinite(action.weight) ||
      action.weight < 0 ||
      action.weight > 100 ||
      !Number.isFinite(action.threshold) ||
      action.threshold < 0 ||
      action.threshold > 100)
  )
    return state;
  if (
    action.kind === "publish-rule" &&
    action.version !== publishedRule(state.events, action.ruleId).version + 1
  )
    return state;
  const before =
    action.kind === "assign"
      ? (previous.analyst || "Sem responsável") +
        " / " +
        (previous.chamber || "Câmara a definir")
      : action.kind === "publish-rule"
        ? "Versão anterior preservada"
        : previous.missing.join(", ") || "Sem complemento solicitado";
  const after =
    action.kind === "assign"
      ? action.analyst + " / " + (action.chamber || "Câmara a definir")
      : action.kind === "publish-rule"
        ? action.ruleId +
          " v" +
          action.version +
          ": peso " +
          action.weight +
          ", limiar " +
          action.threshold
        : action.kind === "receive-documents"
          ? "Recebido: " +
            action.documentIds.join(", ") +
            "; reanálise solicitada"
          : "Solicitado: " + action.documentIds.join(", ");
  return {
    ...state,
    events: [
      ...state.events,
      {
        kind: "workflow-action",
        sequence: state.events.length,
        action,
        processId: process.scenario.id,
        author: CURRENT_ANALYST,
        reason: reason.trim(),
        before,
        after,
        tick: state.tick,
        occurredAt: state.clock,
      },
    ],
  };
}
