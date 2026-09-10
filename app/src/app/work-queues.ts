import type { ProcessExecutionProjection } from "../domain/model";
import { currentExecutionEvents, workflowFor } from "../domain/workflow";

export function pendingHumanWork(process: ProcessExecutionProjection) {
  if (workflowFor(process).missing.length) return false;
  const latest = [...currentExecutionEvents(process.events)].reverse().find((event) => event.kind === "human-decision-requested" || event.kind === "human-decision-recorded");
  return latest?.kind === "human-decision-requested";
}

export function readyForIssuance(process: ProcessExecutionProjection) {
  const decision = [...currentExecutionEvents(process.events)].reverse().find((event) => event.kind === "human-decision-recorded");
  return decision?.kind === "human-decision-recorded" && decision.decision.kind !== "request-complement"
    && !workflowFor(process).missing.length
    && !currentExecutionEvents(process.events).some((event) => event.kind === "dossier-issued");
}
