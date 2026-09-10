import {
  ArrowSquareOut,
  CheckCircle,
  FileText,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react";

import { PROVENANCE_LABELS } from "../../app/operation-data";
import type { Evidence, OperationProjection } from "../../domain/model";
import { PanelFrame } from "../shell/PanelFrame";

interface ProcessInspectorProps {
  readonly projection: OperationProjection;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onResolve: () => void;
  readonly onOpenDossier: () => void;
  readonly onSelectEvidence: (evidence: Evidence) => void;
  readonly onOpenProcess: () => void;
}

export function ProcessInspector({
  projection,
  collapsed,
  onToggle,
  onResolve,
  onOpenDossier,
  onSelectEvidence,
  onOpenProcess,
}: ProcessInspectorProps) {
  return (
    <PanelFrame
      className="process-inspector"
      title="Inspetor do processo"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="process-heading">
        <div>
          <strong>{projection.scenario.id}</strong>
          <span>{projection.scenario.title}</span>
        </div>
        <span className="status-chip">{statusLabel(projection)}</span>
      </div>

      <dl className="process-metadata">
        <div><dt>Interessado</dt><dd>{projection.scenario.applicant}</dd></div>
        <div><dt>Município</dt><dd>{projection.scenario.municipality}</dd></div>
        <div><dt>Data de entrada</dt><dd>01 set 2026 · 09:14</dd></div>
        <div><dt>Nº do processo</dt><dd>{projection.scenario.id}</dd></div>
      </dl>

      <section className="inspector-section">
        <h3>Evidências</h3>
        {projection.evidence.length === 0 ? (
          <div className="waiting-state" role="status">
            <MapPin aria-hidden="true" />
            <span>Aguardando a análise territorial.</span>
          </div>
        ) : (
          <div className="evidence-list">
            {projection.evidence.map((evidence) => (
              <button
                className="evidence-row"
                type="button"
                key={evidence.id}
                onClick={() => onSelectEvidence(evidence)}
              >
                {projection.scenario.focusLayer === "none" ? <CheckCircle aria-hidden="true" /> : <WarningCircle aria-hidden="true" />}
                <span>
                  <strong>{evidence.title}: {evidence.measure}</strong>
                  <span>{evidence.detail}</span>
                  <small>
                    {PROVENANCE_LABELS[evidence.provenance]} · {evidence.source} · {formatDate(evidence.observedAt)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="inspector-section route-summary">
        <div>
          <span>Câmara recomendada</span>
          <strong>{projection.recommendation?.chamber ?? "Aguardando score"}</strong>
        </div>
        <div>
          <span>Prazo até decisão</span>
          <strong className="text-critical">{formatDueDate(projection.scenario.recommendation.dueAt)}</strong>
        </div>
      </section>

      <section className="inspector-section">
        <h3>Resumo do risco</h3>
        <div className="risk-summary">
          <strong>{projection.score ?? "--"}<small>/100</small></strong>
          <div>
            <RiskBar label="Evidência territorial" value={projection.scenario.focusLayer === "none" ? "0%" : "45%"} className="risk-bar--critical" />
            <RiskBar label="Integridade cadastral" value={projection.scenario.id === "PROC-2026-0512" ? "35%" : "20%"} className="risk-bar--warning" />
            <RiskBar label="Complexidade técnica" value="20%" className="risk-bar--attention" />
            <RiskBar label="Outros fatores" value="10%" className="risk-bar--muted" />
          </div>
        </div>
      </section>

      <div className="inspector-actions">
        {projection.status === "human-decision-required" ? (
          <button className="button button--primary" type="button" onClick={onResolve}>
            <CheckCircle aria-hidden="true" /> Resolver pendência
          </button>
        ) : projection.status === "opinion-ready" ? (
          <button className="button button--primary" type="button" onClick={onOpenDossier}>
            <FileText aria-hidden="true" /> Emitir parecer
          </button>
        ) : projection.status === "opinion-issued" ? (
          <button className="button button--primary" type="button" onClick={onOpenDossier}>
            <FileText aria-hidden="true" /> Ver dossiê
          </button>
        ) : projection.status === "awaiting-complement" ? (
          <button className="button button--primary" type="button" disabled>
            <WarningCircle aria-hidden="true" /> Aguardando complemento
          </button>
        ) : (
          <button className="button button--primary" type="button" disabled>
            <MapPin aria-hidden="true" /> Análise em curso
          </button>
        )}
        <button className="button button--secondary" type="button" onClick={onOpenProcess}>
          <ArrowSquareOut aria-hidden="true" /> Abrir processo
        </button>
      </div>
    </PanelFrame>
  );
}

function RiskBar({ label, value, className }: { readonly label: string; readonly value: string; readonly className: string }) {
  return (
    <div className="risk-bar">
      <span>{label}</span>
      <span className={`risk-bar__track ${className}`}><i /></span>
      <strong>{value}</strong>
    </div>
  );
}

function statusLabel(projection: OperationProjection) {
  switch (projection.status) {
    case "in-analysis": return "Em análise";
    case "human-decision-required": return "Decisão humana necessária";
    case "awaiting-complement": return "Aguardando complemento";
    case "opinion-ready": return "Parecer pronto para emissão";
    case "opinion-issued": return "Parecer emitido";
    default: {
      const exhaustive: never = projection.status;
      return exhaustive;
    }
  }
}

function formatDate(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}
