import {
  Check,
  Circle,
  Database,
  GearSix,
  GitBranch,
  Hourglass,
  SpinnerGap,
  TrayArrowDown,
  TrayArrowUp,
  WarningCircle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { AGENTS } from "../../app/operation-data";
import { SPECIALISTS } from "../../app/specialists";
import type { AgentStage, OperationProjection, PortfolioEvent, PortfolioProjection } from "../../domain/model";
import { PanelFrame } from "../shell/PanelFrame";
import { ProcessOwnership } from "./ProcessOwnership";

interface AgentWorkbenchProps {
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
  readonly selectedStage: AgentStage;
  readonly onSelectStage: (stage: AgentStage) => void;
  readonly onSelectProcess: (processId: string) => void;
  readonly onToggle: () => void;
}

export function AgentWorkbench({ projection, portfolio, selectedStage, onSelectStage, onSelectProcess, onToggle }: AgentWorkbenchProps) {
  const selectedAgent = AGENTS.find((agent) => agent.stage === selectedStage) ?? AGENTS[0];
  const process = portfolio.processes.find((item) => item.scenario.id === projection.scenario.id);
  const selectedBranches = process?.branches.filter((branch) => branch.originStage === selectedStage) ?? [];
  const selectableProcesses = portfolio.processes;
  const workflowEvents = process?.events ?? [];

  if (!selectedAgent) return null;

  const selectedComplete = projection.completedStages.includes(selectedAgent.stage);
  const selectedActive = process?.status === "in-analysis" && projection.currentStage === selectedAgent.stage && !selectedComplete;

  return (
    <PanelFrame className="agent-workbench" title="Orquestração do processo" subtitle={`${portfolio.activeProcesses.length} em triagem simultânea`} collapsed={false} onToggle={onToggle}>
      <div className="orchestration-process-selector">
        <label htmlFor="orchestration-process">Processo focado</label>
        <select id="orchestration-process" value={projection.scenario.id} onChange={(event) => onSelectProcess(event.currentTarget.value)}>
          {selectableProcesses.map((item) => <option value={item.scenario.id} key={item.scenario.id}>{item.scenario.id} · {item.scenario.municipality}</option>)}
        </select>
        <span><i aria-hidden="true" /> Atualização pelo diário compartilhado</span>
      </div>
      {process ? <details className="orchestration-ownership"><summary>Responsáveis e câmara · {process.recommendation?.chamber ?? "encaminhamento pendente"}</summary><ProcessOwnership process={process} portfolio={portfolio} /></details> : null}
      <div className="agent-workbench__top">
        <div className="agent-flow" aria-label="Fluxo vertical das seis fases">
          {AGENTS.map((agent) => {
            const complete = projection.completedStages.includes(agent.stage);
            const active = process?.status === "in-analysis" && projection.currentStage === agent.stage && !complete;
            return (
              <button
                className={`agent-node${selectedStage === agent.stage ? " agent-node--selected" : ""}${complete ? " agent-node--completed" : ""}${active ? " agent-node--active" : ""}`}
                type="button"
                key={agent.stage}
                aria-pressed={selectedStage === agent.stage}
                onClick={() => onSelectStage(agent.stage)}
              >
                <span className="agent-node__rail" aria-hidden="true">
                  {complete ? <Check /> : active ? <SpinnerGap /> : <Circle />}
                </span>
                <span className="agent-node__copy">
                  <small>Fase {agent.number}</small>
                  <strong>{agent.shortName}</strong>
                  <span>{complete ? "Concluído" : active ? "Em execução" : "Aguardando"}</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="agent-specification" aria-label={`Especificação da fase ${selectedAgent.number}`}>
          <header>
            <span>Fase {selectedAgent.number} de 6</span>
            <strong className={selectedComplete ? "agent-state agent-state--complete" : selectedActive ? "agent-state agent-state--active" : "agent-state"}>
              {selectedComplete ? "Concluído" : selectedActive ? "Em execução" : "Aguardando"}
            </strong>
          </header>
          <h3>{selectedAgent.shortName}</h3>
          <p>{selectedAgent.purpose}</p>

          <div className="agent-io-grid">
            <AgentSpecificationGroup icon={<TrayArrowDown />} label="Entradas" values={selectedAgent.inputs} />
            <AgentSpecificationGroup icon={<GearSix />} label="Ferramentas" values={selectedAgent.tools} />
            <AgentSpecificationGroup icon={<TrayArrowUp />} label="Saídas" values={selectedAgent.outputs} />
          </div>

          <div className="agent-execution-result">
            <Database aria-hidden="true" />
            <span><small>Resultado nesta execução</small><strong>{selectedComplete ? projection.scenario.stageSummaries[selectedAgent.stage] : selectedActive ? "Processando entradas e dependências desta fase." : "Aguardando a conclusão da fase anterior."}</strong></span>
          </div>

          <section className="phase-branches" aria-label="Ramificações especializadas desta fase">
            <header><GitBranch aria-hidden="true" /><strong>Ramificações especializadas</strong><span>{selectedBranches.length}</span></header>
            {selectedBranches.length === 0 ? <p>Esta fase segue sem convocação extraordinária.</p> : selectedBranches.map((branch) => {
              const specialist = SPECIALISTS.find((item) => item.id === branch.specialistId);
              return <button type="button" className={`phase-branch phase-branch--${branch.status}`} key={branch.id}>
                <span className="phase-branch__state">{branch.status === "resolved" ? <Check /> : branch.status === "queued" ? <Hourglass /> : <SpinnerGap />}</span>
                <span><strong>{branch.title}</strong><small>{branch.specialistId} · {specialist?.name ?? "Especialista"}</small></span>
                <b>{branchLabel(branch.status)}</b>
              </button>;
            })}
          </section>

          {projection.conflict && selectedAgent.stage === "territorial-analysis" ? (
            <div className="conflict-node" role="status">
              <WarningCircle aria-hidden="true" />
              <span><strong>{projection.conflict.title}</strong><small>{projection.conflict.summary}</small></span>
            </div>
          ) : null}
        </section>
      </div>

      <section className="event-log" aria-label="Log de eventos do processo">
        <header><strong>Log de eventos</strong><span>{workflowEvents.length} registros rastreáveis</span></header>
        <div className="event-log__rows">
          {workflowEvents.length === 0 ? (
            <p className="event-log__empty">Recebendo o processo para análise.</p>
          ) : workflowEvents.slice().reverse().map((event, index) => (
            <div className="event-row" key={`${event.occurredAt}-${event.kind}-${index}`}>
              <time>{formatTime(event.occurredAt)}</time>
              <span>{eventSummary(event)}</span>
              <strong>{eventResult(event)}</strong>
            </div>
          ))}
        </div>
      </section>
    </PanelFrame>
  );
}

function branchLabel(status: "waiting" | "queued" | "active" | "resolved") {
  switch (status) {
    case "waiting": return "Aguardando";
    case "queued": return "Em fila";
    case "active": return "Em atividade";
    case "resolved": return "Resolvida";
    default: { const exhaustive: never = status; return exhaustive; }
  }
}

function AgentSpecificationGroup({ icon, label, values }: { readonly icon: ReactNode; readonly label: string; readonly values: readonly string[] }) {
  return (
    <section>
      <header>{icon}<strong>{label}</strong></header>
      <div>{values.map((value) => <span key={value}>{value}</span>)}</div>
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function eventSummary(event: PortfolioEvent) {
  switch (event.kind) {
    case "workflow-action": return event.after;
    case "process-received": return "Processo recebido no portfólio";
    case "stage-started": return `Fase ${stageLabel(event.stage)} iniciada`;
    case "stage-completed": return event.summary;
    case "specialist-requested": return `${event.specialistId} solicitado: ${event.title}`;
    case "specialist-assigned": return `${event.specialistId} alocado ao processo`;
    case "specialist-queued": return `${event.specialistId} sem capacidade disponível`;
    case "specialist-saturated": return `${event.specialistId} atingiu a capacidade`;
    case "branch-resolved": return `${event.specialistId}: ${event.result}`;
    case "evidence-recorded": return `${event.evidence.title}: ${event.evidence.measure}`;
    case "conflict-detected": return event.conflict.summary;
    case "recommendation-created": return `Score ${event.recommendation.score}: ${event.recommendation.route}`;
    case "human-decision-requested": return "Análise automática concluída. Revisão humana adicionada à fila.";
    case "human-decision-recorded": return `Decisão registrada por ${event.decision.author}`;
    case "dossier-issued": return `Dossiê ${event.dossier.identifier} emitido`;
    default: { const exhaustive: never = event; return exhaustive; }
  }
}

function eventResult(event: PortfolioEvent) {
  switch (event.kind) {
    case "workflow-action": return event.author;
    case "process-received": return "Recebido";
    case "stage-started": return "Iniciada";
    case "stage-completed": return "Concluído";
    case "specialist-requested": return "Solicitado";
    case "specialist-assigned": return "Em atividade";
    case "specialist-queued": return "Em fila";
    case "specialist-saturated": return "Saturado";
    case "branch-resolved": return "Resolvida";
    case "evidence-recorded": return event.evidence.provenance === "provided-data" ? "Camada fornecida" : "Simulado";
    case "conflict-detected": return "Revisão";
    case "recommendation-created": return event.recommendation.chamber;
    case "human-decision-requested": return "Pendente";
    case "human-decision-recorded": return "Registrada";
    case "dossier-issued": return "Emitido";
    default: { const exhaustive: never = event; return exhaustive; }
  }
}

function stageLabel(stage: AgentStage) {
  const agent = AGENTS.find((item) => item.stage === stage);
  return agent?.shortName ?? stage;
}
