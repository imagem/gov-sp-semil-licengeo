import { Buildings, Robot, ArrowRight } from "@phosphor-icons/react";
import type { PortfolioProjection, ProcessExecutionProjection, SpecialistDepartment } from "../../domain/model";
import { AGENTS } from "../../app/operation-data";

export const DEPARTMENT_LABELS: Record<SpecialistDepartment, string> = {
  "entry-quality": "Entrada e qualidade",
  "territorial-intelligence": "Inteligência territorial",
  "regulation-coordination": "Regulação e articulação",
  "decision-operation": "Decisão e operação",
};

export function ProcessOwnership({ process, portfolio }: { readonly process: ProcessExecutionProjection; readonly portfolio: PortfolioProjection }) {
  const assigned = portfolio.specialists.filter((load) => load.activeAssignments.some((assignment) => assignment.processId === process.scenario.id));
  const phase = AGENTS.find((agent) => agent.stage === process.currentStage);
  return <div className="ownership-chain" aria-label="Responsabilidade do processo">
    <div><Robot /><span><small>Em execução agora{phase ? " · " + phase.shortName : ""}</small><strong>{assigned.length ? assigned.map((load) => load.specialist.name).join(" · ") : process.status === "queued" ? "Aguardando entrada" : process.status === "triage-completed" ? "Triagem digital encerrada" : phase?.shortName ?? "Orquestração digital"}</strong><em>{[...new Set(assigned.map((load) => DEPARTMENT_LABELS[load.specialist.department]))].join(" · ") || "Orquestração digital"}</em></span></div>
    <ArrowRight aria-hidden="true" />
    <div><Buildings /><span><small>Câmara recomendada · simulação</small><strong>{process.recommendation?.chamber ?? "Aguardando encaminhamento"}</strong><em>{process.recommendation?.route ?? "Definida após a análise de conformidade"}</em></span></div>
  </div>;
}
