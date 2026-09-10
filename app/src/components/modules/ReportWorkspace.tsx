import { useEffect, useRef, useState } from "react";
import { ArrowsOut, DownloadSimple, FileText, X } from "@phosphor-icons/react";
import type { ProcessExecutionProjection } from "../../domain/model";
import {
  documentsFor,
  peopleFor,
  processLabel,
  timeLabel,
} from "../../app/workspace-data";
import {
  exportCsv,
  exportPdf,
  type ReportDocument,
} from "../../app/report-export";
import { workflowFor } from "../../domain/workflow";
import { useWorkspace } from "./workspace-context";
import { eventTitle } from "./AuditWorkspace";

const REPORT_TYPES = [
  "Dossiê do processo",
  "Resumo do portfólio",
  "Qualidade documental",
  "Carga por câmara",
  "Histórico de decisões",
];
export function ReportWorkspace({
  processes,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
}) {
  const api = useWorkspace();
  const [selectedId, setSelectedId] = useState(processes[0]?.scenario.id ?? "");
  const [snapshot, setSnapshot] = useState<ReportDocument | null>(null);
  const [saved, setSaved] = useState<ReportDocument[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");
  const activeId = processes.some((p) => p.scenario.id === selectedId) ? selectedId : processes[0]?.scenario.id ?? "";
  function generate(type: string) {
    const selected = processes.find((p) => p.scenario.id === activeId);
    const scope =
      type === "Dossiê do processo" ? (selected ? [selected] : []) : processes;
    const document = makeReport(type, scope, api.portfolio.clock);
    setSnapshot(document);
    setSaved((items) => [document, ...items].slice(0, 12));
  }
  return (
    <div className="report-workspace">
      <div className="workspace-filterbar">
        <select
          aria-label="Processo para relatório"
          value={activeId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {processes.map((p) => (
            <option key={p.scenario.id} value={p.scenario.id}>
              {p.scenario.id} · {p.scenario.municipality}
            </option>
          ))}
        </select>
        <span>Retratos datados · sessão atual · demonstração</span>
      </div>
      <div className="report-layout">
        <aside className="report-catalog">
          <h3>Modelos de relatório</h3>
          {REPORT_TYPES.map((type) => (
            <article key={type}>
              <FileText />
              <span>
                <strong>{type}</strong>
                <small>
                  {type === "Dossiê do processo"
                    ? activeId
                    : processes.length + " processos no recorte"}
                </small>
              </span>
              <button
                className="record-title"
                disabled={!processes.length}
                onClick={() => generate(type)}
              >
                Visualizar
              </button>
            </article>
          ))}
          <h3>Gerados nesta visita</h3>
          {saved.map((report, index) => (
            <button
              className="saved-report"
              key={index}
              onClick={() => setSnapshot(report)}
            >
              <strong>{report.title}</strong>
              <small>{report.stamp}</small>
            </button>
          ))}
        </aside>
        <section className="report-reading">
          {snapshot ? (
            <>
              <div className="report-reading__tools">
                <strong>Prévia</strong>
                <button
                  className="icon-button"
                  title="Exportar PDF"
                  aria-label="Exportar PDF"
                  onClick={() => {
                    setError("");
                    void exportPdf(snapshot).catch(() =>
                      setError(
                        "Não foi possível gerar o PDF. Tente novamente.",
                      ),
                    );
                  }}
                >
                  <DownloadSimple />
                </button>
                <button
                  className="button button--secondary"
                  onClick={() => exportCsv(snapshot)}
                >
                  CSV
                </button>
                <button
                  className="icon-button"
                  title="Leitura em tela cheia"
                  aria-label="Leitura em tela cheia"
                  onClick={() => setFullscreen(true)}
                >
                  <ArrowsOut />
                </button>
              </div>
              {error ? <p role="alert">{error}</p> : null}
              <ReportBody report={snapshot} />
            </>
          ) : (
            <div className="workspace-empty">
              <FileText />
              <h3>Selecione um relatório</h3>
              <p>Os filtros atuais definem o conteúdo do documento.</p>
            </div>
          )}
        </section>
      </div>
      {fullscreen && snapshot ? (
        <ReportFullscreen
          report={snapshot}
          close={() => setFullscreen(false)}
        />
      ) : null}
    </div>
  );
}
function ReportBody({ report }: { readonly report: ReportDocument }) {
  return (
    <article className="compact-report">
      <header>
        <strong>LicenGeo SP</strong>
        <small>SEMIL · demonstração</small>
      </header>
      <h3>{report.title}</h3>
      <p className="muted">{report.stamp}</p>
      <p>{report.scope}</p>
      {report.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      <div className="table-scroll">
        <table className="workspace-table">
          <thead>
            <tr>
              {report.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        Documento demonstrativo. Dados sintéticos e resultados simulados. Sem
        validade institucional.
      </footer>
    </article>
  );
}
function ReportFullscreen({
  report,
  close,
}: {
  readonly report: ReportDocument;
  readonly close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="report-fullscreen"
      onClose={close}
      aria-label="Relatório em tela cheia"
    >
      <button
        className="icon-button"
        aria-label="Fechar relatório"
        onClick={close}
      >
        <X />
      </button>
      <ReportBody report={report} />
    </dialog>
  );
}
function makeReport(
  title: string,
  processes: readonly ProcessExecutionProjection[],
  clock: string,
): ReportDocument {
  const common = {
    title,
    stamp:
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(clock)) +
      " · relógio simulado " +
      timeLabel(clock),
    scope:
      processes.length +
      " processos / " +
      processes.map((p) => p.scenario.id).join(", "),
  };
  if (title === "Qualidade documental")
    return {
      ...common,
      paragraphs: [
        "Avaliação demonstrativa: completude, legibilidade, vigência e consistência. Sem avaliação, não há índice.",
      ],
      columns: ["Processo", "Documento", "Estado", "Qualidade"],
      rows: processes.flatMap((p) =>
        documentsFor(p).map((doc) => [
          p.scenario.id,
          doc.title,
          doc.state,
          doc.score === null ? "Não avaliado" : doc.score + "%",
        ]),
      ),
    };
  if (title === "Histórico de decisões")
    return {
      ...common,
      paragraphs: [
        "Decisões e alterações preservadas com autoria e justificativa.",
      ],
      columns: ["Processo", "Horário", "Autor", "Registro"],
      rows: processes.flatMap((p) =>
        p.events
          .filter(
            (e) =>
              e.kind === "workflow-action" ||
              e.kind === "human-decision-recorded" ||
              e.kind === "dossier-issued",
          )
          .map((e) => [
            p.scenario.id,
            timeLabel(e.occurredAt),
            e.kind === "workflow-action"
              ? e.author
              : e.kind === "human-decision-recorded"
                ? e.decision.author
                : e.kind === "dossier-issued"
                  ? e.dossier.issuedBy
                  : "",
            eventTitle(e) +
              (e.kind === "workflow-action"
                ? ". " +
                  e.reason +
                  ". Antes: " +
                  e.before +
                  ". Depois: " +
                  e.after
                : e.kind === "human-decision-recorded"
                  ? ". " + e.decision.justification
                  : ""),
          ]),
      ),
    };
  if (title === "Carga por câmara") {
    const chambers = [
      ...new Set(
        processes.map(
          (p) =>
            workflowFor(p).chamber || p.recommendation?.chamber || "A definir",
        ),
      ),
    ];
    return {
      ...common,
      paragraphs: [
        "Câmaras atribuídas têm precedência. Sem atribuição, usa-se a recomendação produzida.",
      ],
      columns: ["Câmara", "Processos", "Sem analista"],
      rows: chambers.map((chamber) => {
        const items = processes.filter(
          (p) =>
            (workflowFor(p).chamber ||
              p.recommendation?.chamber ||
              "A definir") === chamber,
        );
        return [
          chamber,
          String(items.length),
          String(items.filter((p) => !workflowFor(p).analyst).length),
        ];
      }),
    };
  }
  return {
    ...common,
    paragraphs:
      title === "Dossiê do processo"
        ? processes.flatMap((p) => [
            "Requerente: " +
              p.scenario.applicant +
              ". Representante sintético: " +
              peopleFor(p).representative +
              ".",
            "Estado: " +
              processLabel(p) +
              ". " +
              (p.recommendation
                ? "Recomendação: " +
                  p.recommendation.route +
                  ". Score " +
                  p.recommendation.score +
                  "."
                : "Documento parcial; recomendação ainda não produzida."),
            ...p.evidence.map(
              (e) =>
                e.title +
                ": " +
                e.measure +
                ". " +
                e.detail +
                " Fonte: " +
                e.source +
                ".",
            ),
            ...p.events
              .filter((e) => e.kind === "human-decision-recorded")
              .map(eventTitle),
          ])
        : ["Portfólio filtrado, congelado no instante de geração."],
    columns: ["Processo", "Estado", "Responsável", "Câmara"],
    rows: processes.map((p) => [
      p.scenario.id,
      processLabel(p),
      workflowFor(p).analyst || "Sem responsável",
      workflowFor(p).chamber || p.recommendation?.chamber || "A definir",
    ]),
  };
}
