import { useState } from "react";
import { ArrowRight, Clock, X } from "@phosphor-icons/react";
import type {
  PortfolioEvent,
  ProcessExecutionProjection,
} from "../../domain/model";
import { PHASES, PHASE_NAMES, timeLabel } from "../../app/workspace-data";
import { useWorkspace } from "./workspace-context";

export function eventTitle(event: PortfolioEvent): string {
  switch (event.kind) {
    case "workflow-action":
      return event.after;
    case "human-decision-recorded":
      return "Decisão: " + event.decision.justification;
    case "human-decision-requested":
      return "Revisão humana solicitada";
    case "process-received":
      return "Processo recebido";
    case "stage-started":
      return "Início: " + PHASE_NAMES[PHASES.indexOf(event.stage)];
    case "stage-completed":
      return event.summary;
    case "evidence-recorded":
      return event.evidence.title + ": " + event.evidence.measure;
    case "conflict-detected":
      return event.conflict.title;
    case "recommendation-created":
      return (
        event.recommendation.route + " · score " + event.recommendation.score
      );
    case "specialist-requested":
      return event.title;
    case "specialist-assigned":
      return event.specialistId + " alocado";
    case "specialist-queued":
      return event.specialistId + " em fila";
    case "specialist-saturated":
      return event.specialistId + " sem capacidade";
    case "branch-resolved":
      return event.result;
    case "dossier-issued":
      return "Parecer emitido: " + event.dossier.identifier;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
function category(event: PortfolioEvent) {
  if (event.kind === "workflow-action")
    return event.action.kind === "publish-rule"
      ? "rules"
      : event.action.kind === "assign"
        ? "routing"
        : "documents";
  if (
    event.kind === "human-decision-recorded" ||
    event.kind === "dossier-issued"
  )
    return "human";
  if (event.kind === "evidence-recorded" || event.kind === "conflict-detected")
    return "documents";
  if (event.kind === "recommendation-created") return "routing";
  return "engine";
}
export function AuditWorkspace({
  processes,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
}) {
  const api = useWorkspace();
  const [scope, setScope] = useState("all");
  const [processId, setProcessId] = useState("all");
  const [selectedKey, setSelectedKey] = useState("");
  const rows = processes
    .flatMap((p) =>
      p.events.map((event, index) => ({
        event,
        key: p.scenario.id + "-" + index,
      })),
    )
    .sort((a, b) => b.event.tick - a.event.tick);
  const visible = rows.filter(
    ({ event }) =>
      (scope === "all" || category(event) === scope) &&
      (processId === "all" || event.processId === processId),
  );
  const selected = rows.find((row) => row.key === selectedKey)?.event;
  return (
    <div className="audit-workspace">
      <div className="workspace-filterbar">
        <select
          aria-label="Processo da auditoria"
          value={processId}
          onChange={(e) => setProcessId(e.target.value)}
        >
          <option value="all">Todos os processos</option>
          {processes.map((p) => (
            <option key={p.scenario.id}>{p.scenario.id}</option>
          ))}
        </select>
        <select
          aria-label="Tipo de evento"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="all">Todos os eventos</option>
          <option value="human">Ações humanas</option>
          <option value="rules">Regras</option>
          <option value="documents">Documentos e evidências</option>
          <option value="routing">Encaminhamento</option>
          <option value="engine">Triagem digital</option>
        </select>
        <span>{visible.length} eventos rastreáveis</span>
      </div>
      <div className={selected ? "master-detail has-preview" : "master-detail"}>
        <div className="audit-timeline">
          {visible.map(({ event, key }) => (
            <button
              className={
                selectedKey === key ? "audit-entry is-selected" : "audit-entry"
              }
              key={key}
              onClick={() => setSelectedKey(key)}
            >
              <Clock />
              <time>{timeLabel(event.occurredAt)}</time>
              <span>
                <strong>{eventTitle(event)}</strong>
                <small>
                  {event.processId} ·{" "}
                  {event.kind === "workflow-action"
                    ? event.author
                    : event.kind === "human-decision-recorded"
                      ? event.decision.author
                      : event.kind === "dossier-issued"
                        ? event.dossier.issuedBy
                        : "Orquestração digital"}
                </small>
              </span>
              <ArrowRight />
            </button>
          ))}
          {!visible.length ? (
            <p className="workspace-empty">Nenhum evento neste recorte.</p>
          ) : null}
        </div>
        {selected ? (
          <aside className="workspace-inspector">
            <header>
              <h3>Detalhe do evento</h3>
              <button
                className="icon-button"
                aria-label="Fechar evento"
                onClick={() => setSelectedKey("")}
              >
                <X />
              </button>
            </header>
            <p>{eventTitle(selected)}</p>
            <small>
              {selected.processId} · {timeLabel(selected.occurredAt)}
            </small>
            {selected.kind === "workflow-action" ? (
              <>
                <h4>Antes</h4>
                <p>{selected.before}</p>
                <h4>Depois</h4>
                <p>{selected.after}</p>
                <h4>Justificativa</h4>
                <p>{selected.reason}</p>
                <p>Autor: {selected.author}</p>
                {selected.action.kind === "publish-rule" ? (
                  <button className="text-action" onClick={api.openRules}>
                    Consultar versões da regra <ArrowRight />
                  </button>
                ) : null}
              </>
            ) : selected.kind === "human-decision-recorded" ? (
              <>
                <h4>Recomendação original</h4>
                <p>{selected.decision.originalRoute}</p>
                <h4>Decisão registrada</h4>
                <p>
                  {selected.decision.selectedRoute ?? selected.decision.kind}
                </p>
                <p>{selected.decision.justification}</p>
              </>
            ) : selected.kind === "evidence-recorded" ? (
              <>
                <h4>Fonte e evidência</h4>
                <p>{selected.evidence.source}</p>
                <p>{selected.evidence.detail}</p>
                <small>
                  {selected.evidence.provenance} ·{" "}
                  {selected.evidence.observedAt}
                </small>
              </>
            ) : (
              <p>Registro preservado no diário desta simulação.</p>
            )}
            <button
              className="button button--secondary"
              onClick={() => api.openProcess(selected.processId)}
            >
              Abrir dossiê
            </button>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
