import {
  ArrowsOut,
  ChartBar,
  Check,
  Circle,
  FileMagnifyingGlass,
  SlidersHorizontal,
  SpinnerGap,
  TreeStructure,
} from "@phosphor-icons/react";

import { AGENTS } from "../../app/operation-data";
import { pendingHumanWork } from "../../app/work-queues";
import type { OperationProjection, PortfolioProjection } from "../../domain/model";

interface ScenarioToolbarProps {
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
  readonly onToggleHuman: () => void;
  readonly onToggleRules: () => void;
  readonly onToggleInspector: () => void;
  readonly onToggleAgents: () => void;
  readonly onFocusMap: () => void;
  readonly humanOpen: boolean;
  readonly rulesOpen: boolean;
  readonly inspectorOpen: boolean;
  readonly agentsOpen: boolean;
  readonly focusMode: boolean;
}

export function ScenarioToolbar({
  projection,
  portfolio,
  onToggleHuman,
  onToggleRules,
  onToggleInspector,
  onToggleAgents,
  onFocusMap,
  humanOpen,
  rulesOpen,
  inspectorOpen,
  agentsOpen,
  focusMode,
}: ScenarioToolbarProps) {
  const queued = portfolio.queuedProcesses.length;

  return (
    <section className="scenario-toolbar" aria-label="Processo em execução e painéis da operação">
      <div className="active-process-summary" aria-live="polite">
        <span className="active-process-summary__pulse" aria-hidden="true" />
        <span>
          <strong>{projection.scenario.id}</strong>
          <small>{projection.scenario.title} · {projection.scenario.municipality}</small>
          <em>{portfolio.activeProcesses.length} em triagem · {queued} aguardando · {portfolio.completedProcesses.length} processados</em>
        </span>
      </div>
      <ol className="agent-pipeline" aria-label="Resumo das seis fases do processo">
        {AGENTS.map((agent) => {
          const complete = projection.completedStages.includes(agent.stage);
          const active = portfolio.activeProcesses.some((process) => process.scenario.id === projection.scenario.id) && projection.currentStage === agent.stage && !complete;
          const state = complete ? "concluído" : active ? "em execução" : "aguardando";
          return (
            <li className={complete ? "agent-pipeline__step agent-pipeline__step--complete" : active ? "agent-pipeline__step agent-pipeline__step--active" : "agent-pipeline__step"} key={agent.stage} aria-label={`${agent.shortName}: ${state}`}>
              <i aria-hidden="true">{complete ? <Check /> : active ? <SpinnerGap /> : <Circle />}</i>
              <span>{pipelineLabel(agent.number)}</span>
            </li>
          );
        })}
      </ol>
      <div className="panel-launchers" aria-label="Painéis da operação">
        <button type="button" aria-pressed={agentsOpen} onClick={onToggleAgents}><TreeStructure /> Orquestração</button>
        <button type="button" aria-pressed={humanOpen} onClick={onToggleHuman}><ChartBar /> Pendências <b>{portfolio.processes.filter(pendingHumanWork).length}</b></button>
        <button type="button" aria-pressed={rulesOpen} onClick={onToggleRules}><SlidersHorizontal /> Regras</button>
        <button type="button" aria-pressed={inspectorOpen} onClick={onToggleInspector}><FileMagnifyingGlass /> Inspetor</button>
        <button className="focus-map-button" type="button" aria-pressed={focusMode} onClick={onFocusMap}><ArrowsOut /> {focusMode ? "Restaurar" : "Foco no mapa"}</button>
      </div>
    </section>
  );
}

function pipelineLabel(number: number) {
  switch (number) {
    case 1: return "Receber";
    case 2: return "Validar";
    case 3: return "Verificar";
    case 4: return "Classificar";
    case 5: return "Encaminhar";
    case 6: return "Parecer";
    default: return `Fase ${number}`;
  }
}
