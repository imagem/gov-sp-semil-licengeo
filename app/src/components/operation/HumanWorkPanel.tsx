import { ArrowRight, CheckCircle, Clock, FileMagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { pendingHumanWork, readyForIssuance } from "../../app/work-queues";
import type { OperationProjection, PortfolioProjection, ProcessExecutionProjection } from "../../domain/model";
import { PanelFrame } from "../shell/PanelFrame";
import { resolveHumanWorkProcessId, type HumanWorkTab } from "./human-work-selection";
import { ProcessOwnership } from "./ProcessOwnership";
import { pendingExplanation } from "../../app/pending-trace";
import { EXPLANATION_RULES } from "../../app/operation-data";
import { SPECIALISTS } from "../../app/specialists";

interface HumanWorkPanelProps {
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onResolve: (processId: string) => void;
  readonly onRequestComplement: (processId: string) => void;
  readonly onOpenDossier: () => void;
  readonly onOpenProcesses: () => void;
  readonly onSelectProcess: (processId: string) => void;
  readonly selectedPendingProcessId: string | null;
  readonly pinnedProcessId: string | null;
  readonly onReleaseFocus: () => void;
}

export function HumanWorkPanel({ projection, portfolio, collapsed, onToggle, onResolve, onRequestComplement, onOpenDossier, onOpenProcesses, onSelectProcess, selectedPendingProcessId, pinnedProcessId, onReleaseFocus }: HumanWorkPanelProps) {
  const [tab, setTab] = useState<HumanWorkTab>("pending");
  const groups = [
    { id: "pending", label: "Pendências", items: portfolio.processes.filter(pendingHumanWork) },
    { id: "decisions", label: "Decisões", items: portfolio.processes.filter((process) => process.events.some((event) => event.kind === "human-decision-recorded")) },
    { id: "issuance", label: "Emissão", items: portfolio.processes.filter(readyForIssuance) },
  ] satisfies readonly { readonly id: HumanWorkTab; readonly label: string; readonly items: readonly ProcessExecutionProjection[] }[];
  const group = groups.find((item) => item.id === tab) ?? groups[0];
  const selectedProcessId = resolveHumanWorkProcessId(tab, selectedPendingProcessId, projection.scenario.id);
  const selected = group?.items.find((item) => item.scenario.id === selectedProcessId);
  const explanation = selected ? pendingExplanation(selected, EXPLANATION_RULES, SPECIALISTS) : null;
  return <PanelFrame className="human-work-panel" title="Trabalho humano" collapsed={collapsed} onToggle={onToggle}>
    <div className="work-tabs" role="tablist" aria-label="Tipos de trabalho humano">
      {groups.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "work-tab work-tab--selected" : "work-tab"} key={item.id} onClick={() => setTab(item.id)}>{item.label} <span>{item.items.length}</span></button>)}
    </div>
    <div className="queue-list" aria-label={group?.label}>
      {group?.items.map((process) => <button type="button" className={selected === process ? "queue-row queue-row--selected" : "queue-row"} key={process.scenario.id} onClick={() => onSelectProcess(process.scenario.id)}><CheckCircle /><span className="queue-row__main"><strong>{process.scenario.id}</strong><small>{process.scenario.municipality}{pinnedProcessId === process.scenario.id ? " · Foco fixado" : ""}</small></span><ArrowRight /></button>)}
    </div>
    {!group?.items.length ? <div className="work-empty"><CheckCircle /><h3>{tab === "pending" ? "Nenhuma pendência" : tab === "decisions" ? "Nenhuma decisão registrada" : "Nenhum parecer para emissão"}</h3><p>{tab === "pending" ? "Os processos seguem em triagem. Solicitações de revisão aparecerão aqui." : "Aguardando a próxima ação humana."}</p></div> : !selected ? <p className="work-empty">Selecione um processo da fila para revisar.</p> : null}
    {selected ? <div className="selected-work"><h3>{selected.scenario.id}</h3><p>{selected.scenario.title}</p>{pinnedProcessId === selected.scenario.id ? <button className="text-action" type="button" onClick={onReleaseFocus}>Liberar foco</button> : null}
      <ProcessOwnership process={selected} portfolio={portfolio} />
      {tab === "pending" && explanation ? <section className="pending-explanation" aria-label="Por que esta pendência?">
        <h4>Por que esta pendência?</h4>
        <dl>
          <div><dt>Quem identificou</dt><dd>{explanation.producer}</dd></div>
          <div><dt>Regra demonstrativa</dt><dd>{explanation.ruleCode} · {explanation.ruleTitle}</dd></div>
          <div><dt>Evidência</dt><dd>{explanation.evidence}</dd></div>
          <div><dt>Por que revisar</dt><dd>{explanation.reason}</dd></div>
          <div><dt>Ação recomendada</dt><dd>{`${explanation.action.replace(/[.!?]$/, "")}. Conferir as fontes e registrar decisão fundamentada.`}</dd></div>
        </dl>
        {explanation.specialists.length ? <p><strong>Especialistas convocados:</strong> {explanation.specialists.map((item) => `${item.id} ${item.name} (${item.trigger})`).join("; ")}</p> : <p>Nenhum especialista convocado neste processo.</p>}
      </section> : null}
      <section className="human-evidence-summary"><h4>Evidências registradas</h4>{selected.evidence.map((evidence) => <p key={evidence.id}><strong>{evidence.title}: {evidence.measure}</strong><br />{evidence.detail}</p>)}</section>
      <div className="action-row">{tab === "pending" ? <><button className="button button--primary" type="button" onClick={() => onResolve(selected.scenario.id)}><CheckCircle /> Revisar decisão</button><button className="button button--secondary" type="button" onClick={() => onRequestComplement(selected.scenario.id)}><Clock /> Complemento</button></> : <button className="button button--primary" type="button" onClick={onOpenDossier}><FileMagnifyingGlass /> Abrir dossiê</button>}</div>
    </div> : null}
    <button className="text-action" type="button" onClick={onOpenProcesses}>Ver todos os processos <ArrowRight /></button>
  </PanelFrame>;
}
