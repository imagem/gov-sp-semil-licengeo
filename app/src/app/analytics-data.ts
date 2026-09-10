import type { ProcessExecutionProjection } from "../domain/model";
import { currentExecutionEvents, workflowFor } from "../domain/workflow";
import { documentsFor } from "./workspace-data";
import { OPERATION_SCENARIOS } from "./operation-scenarios";

export function sessionRows(processes: readonly ProcessExecutionProjection[]) {
  return processes.map((p) => {
    const events = currentExecutionEvents(p.events);
    const start =
      events.find((e) => e.kind === "process-received") ??
      events.find((e) => e.kind === "stage-started" && e.stage === "receiving");
    const end = events.find(
      (e) => e.kind === "stage-completed" && e.stage === "opinion",
    );
    return {
      id: p.scenario.id,
      processId: p.scenario.id,
      date: start?.occurredAt.slice(11, 19) ?? "",
      completedAt: end?.occurredAt.slice(11, 19) ?? "",
      chamber:
        workflowFor(p).chamber || p.recommendation?.chamber || "A definir",
      state: workflowFor(p).missing.length
        ? "Bloqueado"
        : p.status === "queued"
          ? "Aguardando"
          : p.status === "triage-completed"
            ? "Concluído"
            : "Em triagem",
      duration: start && end ? (end.tick - start.tick) * 3 : null,
      quality: documentsFor(p).reduce((sum, d) => sum + (d.score ?? 0), 0) / 4,
      evidence: p.evidence.length,
    };
  });
}
const DAILY_VOLUME = [
  8, 12, 10, 14, 9, 6, 4, 11, 15, 13, 10, 12, 5, 3, 9, 14, 12, 16, 11, 7, 5, 13,
  15, 12, 17, 14, 6, 4, 12, 16,
];
export function historicalRows(
  processes: readonly ProcessExecutionProjection[],
  days: number,
) {
  return DAILY_VOLUME.slice(-days).flatMap((volume, day) =>
    OPERATION_SCENARIOS.slice(0, volume).flatMap((scenario, index) => {
      if (!processes.some((p) => p.scenario.id === scenario.id)) return [];
      const date = new Date("2026-08-01T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + day + 30 - days);
      const fixtureDay = day + 30 - days;
      return [
        {
          id: "H-" + fixtureDay + "-" + scenario.id,
          processId: scenario.id,
          date: date.toISOString().slice(0, 10),
          completedAt: "",
          chamber: scenario.recommendation.chamber,
          state: index % 5 === 0 ? "Em triagem" : "Concluído",
          duration: index % 5 === 0 ? null : 2 + (index % 6) + (fixtureDay % 3),
          quality: 75 + (index % 6) * 5,
          evidence: scenario.evidence.length,
        },
      ];
    }),
  );
}
