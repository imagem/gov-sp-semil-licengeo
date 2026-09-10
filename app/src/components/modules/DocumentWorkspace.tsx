import { useState } from "react";
import type { CSSProperties } from "react";
import { FileText, X, ArrowRight } from "@phosphor-icons/react";
import type { ProcessExecutionProjection } from "../../domain/model";
import { documentsFor, peopleFor } from "../../app/workspace-data";
import { workflowFor } from "../../domain/workflow";
import { useWorkspace } from "./workspace-context";

const DIMENSIONS = ["Completude", "Legibilidade", "Vigência", "Consistência"];
type QualityBarStyle = CSSProperties & {
  readonly "--quality": string;
  readonly "--quality-color": string;
};

export function DocumentWorkspace({
  processes,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
}) {
  const api = useWorkspace();
  const [selected, setSelected] = useState("");
  const [dimension, setDimension] = useState<number | null>(null);
  const rows = processes.flatMap((process) =>
    documentsFor(process).map((doc) => ({ process, doc })),
  );
  const visible = rows.filter(
    ({ doc }) => dimension === null || doc.values[dimension] !== 100,
  );
  const current = rows.find(
    ({ process, doc }) => process.scenario.id + doc.id === selected,
  );
  return (
    <>
      <div className="register-heading">
        <h3>Qualidade documental</h3>
        <span>{visible.length} documentos · avaliação demonstrativa</span>
      </div>
      <div className="quality-filters">
        {DIMENSIONS.map((name, index) => (
          <button
            key={name}
            aria-pressed={dimension === index}
            onClick={() => setDimension(dimension === index ? null : index)}
          >
            {name}
            <b>{rows.filter(({ doc }) => doc.values[index] !== 100).length}</b>
          </button>
        ))}
        {dimension !== null ? (
          <button onClick={() => setDimension(null)}>Limpar recorte</button>
        ) : null}
      </div>
      <div className={current ? "master-detail has-preview" : "master-detail"}>
        <div className="table-scroll">
          <table className="workspace-table quality-table">
            <thead>
              <tr>
                <th>Documento / processo</th>
                {DIMENSIONS.map((label) => (
                  <th key={label}>{label}</th>
                ))}
                <th>Qualidade</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ process, doc }) => (
                <tr key={process.scenario.id + doc.id}>
                  <td>
                    <button
                      className="record-title"
                      onClick={() => setSelected(process.scenario.id + doc.id)}
                    >
                      {doc.title}
                    </button>
                    <small>
                      {process.scenario.id} · v{doc.version}
                    </small>
                    <small>{doc.state}</small>
                  </td>
                  {doc.values.map((value, i) => (
                    <td key={i}>
                      <span
                        className={
                          value === null
                            ? "quality-cell unassessed"
                            : value === 100
                              ? "quality-cell good"
                              : value === 0
                                ? "quality-cell blocked"
                                : "quality-cell attention"
                        }
                      >
                        {value === null
                          ? "Não avaliado"
                          : value === 100
                            ? "Verificado"
                            : value === 0
                              ? "Ausente"
                              : "Revisar"}
                      </span>
                    </td>
                  ))}
                  <td>
                    {doc.score === null ? (
                      "Não avaliado"
                    ) : (
                      <span
                        className="quality-bar"
                        style={
                          {
                            "--quality": `${doc.score}%`,
                            "--quality-color": qualityColor(doc.score),
                          } as QualityBarStyle
                        }
                      >
                        <i aria-hidden="true" />
                        <b>{doc.score}%</b>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length ? (
            <p className="workspace-empty">Nenhum documento neste recorte.</p>
          ) : null}
        </div>
        {current ? (
          <aside className="workspace-inspector">
            <header>
              <h3>{current.doc.title}</h3>
              <button
                className="icon-button"
                aria-label="Fechar documento"
                onClick={() => setSelected("")}
              >
                <X />
              </button>
            </header>
            <div className="document-preview">
              <FileText />
              <strong>{current.doc.title}</strong>
              <p>{current.process.scenario.applicant}</p>
              <p>{current.process.scenario.processType}</p>
              <p>{current.process.scenario.municipality}</p>
              <small>
                Representante: {peopleFor(current.process).representative}
              </small>
              <small>Documento sintético · versão {current.doc.version}</small>
            </div>
            <p>{current.doc.state}</p>
            <p className="muted">
              Qualidade = média das quatro dimensões. Verificado = 100;
              divergência = 50; ausência = 0. Sem avaliação, não há score.
            </p>
            {current.doc.values.includes(50) ? (
              <details open>
                <summary>Comparar informações conflitantes</summary>
                <p>Declaração: documento apresentado pelo requerente.</p>
                <p>
                  Verificação:{" "}
                  {current.process.conflict?.detail ?? "Aguardando comparação."}
                </p>
              </details>
            ) : null}
            <button
              className="button button--secondary"
              onClick={() =>
                api.requestDocuments(
                  current.process.scenario.id,
                  current.doc.id,
                )
              }
            >
              Solicitar substituição
            </button>
            {workflowFor(current.process).missing.includes(current.doc.id) ? (
              <button
                className="button button--primary"
                onClick={() =>
                  api.act(
                    current.process.scenario.id,
                    {
                      kind: "receive-documents",
                      documentIds: [current.doc.id],
                    },
                    "Nova versão documental recebida na demonstração; reanálise autorizada.",
                  )
                }
              >
                Simular recebimento
              </button>
            ) : null}
            <button
              className="text-action"
              onClick={() => api.openProcess(current.process.scenario.id)}
            >
              Abrir dossiê <ArrowRight />
            </button>
            <h4>Histórico do documento</h4>
            {current.process.events
              .filter(
                (e) =>
                  e.kind === "workflow-action" &&
                  (e.action.kind === "request-documents" ||
                    e.action.kind === "receive-documents") &&
                  e.action.documentIds.includes(current.doc.id),
              )
              .map((e, index) => (
                <p key={index}>
                  {e.kind === "workflow-action"
                    ? e.after + " · " + e.author
                    : ""}
                </p>
              ))}
          </aside>
        ) : null}
      </div>
    </>
  );
}

function qualityColor(score: number) {
  return `hsl(${Math.round(score * 1.2)} 64% 42%)`;
}
