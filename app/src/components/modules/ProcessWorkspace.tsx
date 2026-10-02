import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  UserPlus,
  X,
  FileText,
} from "@phosphor-icons/react";
import { CURRENT_ANALYST, workflowFor } from "../../domain/workflow";
import {
  documentsFor,
  peopleFor,
  PHASES,
  PHASE_NAMES,
  processLabel,
} from "../../app/workspace-data";
import type { PortfolioEvent, ProcessExecutionProjection } from "../../domain/model";
import { useWorkspace } from "./workspace-context";
import { ProcessOwnership } from "../operation/ProcessOwnership";
import { DossierMap } from "../map/DossierMap";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { AuditWorkspace } from "./AuditWorkspace";
import { ProcessTrace } from "./ProcessTrace";

export function ProcessWorkspace({
  processes,
  detailId,
  onCloseDetail,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
  readonly detailId: string | null;
  readonly onCloseDetail: () => void;
}) {
  const api = useWorkspace();
  const [tab, setTab] = useState("mine");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const detail = api.portfolio.processes.find(
    (p) => p.scenario.id === detailId,
  );
  if (detail)
    return (
      <ProcessDossier
        key={detail.scenario.id}
        process={detail}
        onBack={onCloseDetail}
      />
    );
  const visible = processes.filter(
    (p) =>
      tab === "all" ||
      (tab === "mine"
        ? workflowFor(p).analyst === CURRENT_ANALYST
        : !workflowFor(p).analyst),
  );
  const preview = processes.find((p) => p.scenario.id === previewId);
  return (
    <>
      <div className="workspace-tabs">
        {[
          ["mine", "Minha fila"],
          ["unassigned", "Sem responsável"],
          ["all", "Todos"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id ?? "all")}
          >
            {label}
            <b>
              {
                processes.filter(
                  (p) =>
                    id === "all" ||
                    (id === "mine"
                      ? workflowFor(p).analyst === CURRENT_ANALYST
                      : !workflowFor(p).analyst),
                ).length
              }
            </b>
          </button>
        ))}
      </div>
      <div className={preview ? "master-detail has-preview" : "master-detail"}>
        <div className="process-register">
          <div className="register-heading">
            <h3>
              {tab === "mine"
                ? "Trabalho atribuído a você"
                : tab === "unassigned"
                  ? "Disponíveis para assumir"
                  : "Portfólio de processos"}
            </h3>
            <span>{visible.length} processos</span>
          </div>
          {visible.map((p) => {
            const work = workflowFor(p);
            const docs = documentsFor(p);
            return (
              <article
                className={
                  previewId === p.scenario.id
                    ? "process-record is-selected"
                    : "process-record"
                }
                key={p.scenario.id}
              >
                <div className="record-identity">
                  <span className="initial-avatar">
                    {peopleFor(p)
                      .representative.split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <button
                      className="record-title"
                      onClick={() => setPreviewId(p.scenario.id)}
                    >
                      {p.scenario.id}
                    </button>
                    <strong>{p.scenario.title}</strong>
                    <small>
                      {p.scenario.applicant} · {p.scenario.municipality}
                    </small>
                    <small>
                      Enviado por {peopleFor(p).representative} · identidade
                      sintética
                    </small>
                  </div>
                </div>
                <div className="record-progress">
                  <PhaseStrip process={p} />
                  <span>{processLabel(p)}</span>
                  <small>
                    {docs.filter((doc) => doc.score === 100).length}/4
                    documentos verificados
                  </small>
                </div>
                <div className="record-owner">
                  <strong>{work.analyst || "Sem responsável"}</strong>
                  <small>
                    {work.chamber
                      ? "Atribuída: " + work.chamber
                      : p.recommendation
                        ? "Recomendada: " + p.recommendation.chamber
                        : "Câmara ainda não definida"}
                  </small>
                  <span className="record-actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Inspecionar processo"
                      aria-label={"Inspecionar " + p.scenario.id}
                      onClick={() => setPreviewId(p.scenario.id)}
                    >
                      <Eye />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title={
                        work.analyst ? "Alterar atribuição" : "Assumir processo"
                      }
                      aria-label={"Atribuir " + p.scenario.id}
                      onClick={() => api.assign(p.scenario.id)}
                    >
                      <UserPlus />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Abrir dossiê"
                      aria-label={"Dossiê " + p.scenario.id}
                      onClick={() => api.openProcess(p.scenario.id)}
                    >
                      <FileText />
                    </button>
                  </span>
                </div>
              </article>
            );
          })}
          {!visible.length ? (
            <div className="workspace-empty">
              <UserPlus />
              <h3>
                {tab === "mine"
                  ? "Sua fila está livre"
                  : "Nenhum processo neste recorte"}
              </h3>
              <p>
                {tab === "mine"
                  ? "Os processos sem responsável estão disponíveis para atribuição."
                  : "Revise os filtros selecionados."}
              </p>
              {tab === "mine" ? (
                <button
                  className="button button--secondary"
                  onClick={() => setTab("unassigned")}
                >
                  Ver sem responsável <ArrowRight />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {preview ? (
          <aside className="workspace-inspector">
            <header>
              <h3>{preview.scenario.id}</h3>
              <button
                className="icon-button"
                aria-label="Fechar prévia"
                onClick={() => setPreviewId(null)}
              >
                <X />
              </button>
            </header>
            <h4>{preview.scenario.title}</h4>
            <p>{preview.scenario.municipality}</p>
            <ProcessOwnership process={preview} portfolio={api.portfolio} />
            <p className="status-chip">{processLabel(preview)}</p>
            <p>
              {preview.evidence.length} evidências registradas ·{" "}
              {preview.branches.filter((b) => b.status === "active").length}{" "}
              especialistas ativos
            </p>
            <button
              className="button button--primary"
              onClick={() => api.openProcess(preview.scenario.id)}
            >
              Abrir dossiê <ArrowRight />
            </button>
            <button
              className="button button--secondary"
              onClick={() => api.assign(preview.scenario.id)}
            >
              Atribuir responsável
            </button>
          </aside>
        ) : null}
      </div>
    </>
  );
}

export function PhaseStrip({
  process,
}: {
  readonly process: ProcessExecutionProjection;
}) {
  return (
    <div className="phase-strip">
      {PHASES.map((phase, index) => (
        <span
          key={phase}
          title={PHASE_NAMES[index]}
          aria-label={
            (PHASE_NAMES[index] ?? "") +
            ": " +
            (process.completedStages.includes(phase)
              ? "concluída"
              : process.currentStage === phase
                ? "ativa"
                : "aguardando")
          }
          className={
            process.completedStages.includes(phase)
              ? "complete"
              : process.currentStage === phase
                ? "active"
                : ""
          }
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}

function ProcessDossier({
  process,
  onBack,
}: {
  readonly process: ProcessExecutionProjection;
  readonly onBack: () => void;
}) {
  const api = useWorkspace();
  const [tab, setTab] = useState("overview");
  const [traceEventKind, setTraceEventKind] = useState<PortfolioEvent["kind"] | undefined>();
  const [evidence, setEvidence] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const work = workflowFor(process);
  return (
    <div className="process-dossier">
      <button className="text-action" onClick={onBack}>
        <ArrowLeft /> Voltar à fila
      </button>
      <header className="dossier-identity">
        <div>
          <span>
            {process.scenario.id} · {process.scenario.municipality}
          </span>
          <h3>{process.scenario.title}</h3>
          <p>
            {process.scenario.applicant} · Representante:{" "}
            {peopleFor(process).representative}
          </p>
          <small>
            Responsável técnico: {peopleFor(process).professional} · Identidades
            sintéticas
          </small>
        </div>
        <button
          className="button button--secondary"
          onClick={() => api.assign(process.scenario.id)}
        >
          <UserPlus /> {work.analyst || "Atribuir responsável"}
        </button>
      </header>
      <div className="workspace-tabs">
        {[
          ["overview", "Visão geral"],
          ["documents", "Documentos"],
          ["territory", "Análise territorial"],
          ["trace", "Trilha visual"],
          ["routing", "Encaminhamento"],
          ["history", "Histórico"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id ?? "overview")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "documents" ? (
        <DocumentWorkspace processes={[process]} />
      ) : tab === "trace" ? (
        <ProcessTrace process={process} onOpenHistory={(kind) => { setTraceEventKind(kind); setTab("history"); }} />
      ) : tab === "history" ? (
        <AuditWorkspace processes={[process]} initialEventKind={traceEventKind} />
      ) : tab === "routing" ? (
        <section className="routing-workspace">
          <ProcessOwnership process={process} portfolio={api.portfolio} />
          <dl className="detail-facts">
            <div>
              <dt>Analista responsável</dt>
              <dd>{work.analyst || "Sem responsável"}</dd>
            </div>
            <div>
              <dt>Câmara responsável</dt>
              <dd>{work.chamber || "Ainda não atribuída"}</dd>
            </div>
            <div>
              <dt>Recomendação preservada</dt>
              <dd>{process.recommendation?.chamber || "Em análise"}</dd>
            </div>
          </dl>
          <label>
            Justificativa da decisão
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="workspace-actions">
            <button
              className="button button--primary"
              disabled={
                !process.recommendation ||
                process.status !== "triage-completed" ||
                processLabel(process) !== "Revisão humana" ||
                work.missing.length > 0 ||
                reason.trim().length < 5
              }
              onClick={() => {
                api.decide(process.scenario.id, {
                  kind: "approve-recommendation",
                  author: CURRENT_ANALYST,
                  justification: reason,
                });
                setReason("");
              }}
            >
              Registrar aprovação da triagem
            </button>
            <button
              className="button button--secondary"
              onClick={() => api.requestDocuments(process.scenario.id)}
            >
              Solicitar complemento
            </button>
            <button
              className="button button--secondary"
              disabled={processLabel(process) !== "Pronto para emissão"}
              onClick={() => api.issue(process.scenario.id)}
            >
              Emitir parecer demonstrativo
            </button>
          </div>
          <p className="status-chip">{processLabel(process)}</p>
        </section>
      ) : (
        <>
          <div className="dossier-overview">
            <section>
              <div className="register-heading">
                <h3>
                  {tab === "overview"
                    ? "Dossiê e ação"
                    : "Evidências no território"}
                </h3>
                <span>{processLabel(process)}</span>
              </div>
              <DossierMap process={process} evidenceId={evidence} />
              <PhaseStrip process={process} />
            </section>
            <aside className="dossier-findings">
              <ProcessOwnership process={process} portfolio={api.portfolio} />
              <h4>Evidências registradas</h4>
              {process.evidence.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={evidence === item.id}
                  onClick={() => setEvidence(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.measure}</span>
                  <small>{item.detail}</small>
                  <small>{item.source}</small>
                </button>
              ))}
              {!process.evidence.length ? (
                <p className="muted">Aguardando verificações territoriais.</p>
              ) : null}
              <button
                className="button button--primary"
                onClick={() => setTab("routing")}
              >
                Revisar encaminhamento <ArrowRight />
              </button>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
