import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, MagnifyingGlass, Funnel, X } from "@phosphor-icons/react";
import type {
  HumanDecisionCommand,
  PortfolioProjection,
} from "../../domain/model";
import type { WorkflowAction } from "../../domain/workflow";
import { workflowFor } from "../../domain/workflow";
import { peopleFor, processLabel } from "../../app/workspace-data";
import type { NavigationId } from "../shell/Sidebar";
import { WorkspaceContext, type WorkspaceApi } from "./workspace-context";
import { WorkflowDialog, type ActionRequest } from "./WorkflowDialog";
import { ProcessWorkspace } from "./ProcessWorkspace";
import { AgentWorkspace } from "./AgentGraph";
import { DataWorkspace } from "./DataWorkspace";
import { AnalyticsWorkspace } from "./AnalyticsWorkspace";
import { ReportWorkspace } from "./ReportWorkspace";
import { AuditWorkspace } from "./AuditWorkspace";
import { LayersContent } from "./LayersContent";

interface ModulePageProps {
  readonly module: Exclude<NavigationId, "operation">;
  readonly portfolio: PortfolioProjection;
  readonly dark: boolean;
  readonly onNavigate: (id: NavigationId) => void;
  readonly onSelectProcess: (id: string) => void;
  readonly act: (id: string, action: WorkflowAction, reason: string) => void;
  readonly decide: (id: string, command: HumanDecisionCommand) => void;
  readonly issue: (id: string) => void;
}
const TITLES = {
  processes: "Processos",
  process: "Processos",
  agents: "Agentes",
  data: "Dados e regras",
  performance: "Desempenho e indicadores",
  indicators: "Indicadores",
  reports: "Relatórios",
  layers: "Camadas territoriais",
  audit: "Auditoria",
};

export function ModulePage({
  module,
  portfolio,
  dark,
  onNavigate,
  onSelectProcess,
  act,
  decide,
  issue,
}: ModulePageProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [type, setType] = useState("");
  const [chamber, setChamber] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dataTab, setDataTab] = useState("documents");
  const [request, setRequest] = useState<ActionRequest | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => { pageRef.current?.scrollTo(0, 0); }, [module, detailId]);
  const processes = portfolio.processes.filter((p) => {
    const work = workflowFor(p);
    const haystack = [
      p.scenario.id,
      p.scenario.title,
      p.scenario.applicant,
      p.scenario.municipality,
      peopleFor(p).representative,
      work.analyst,
      work.chamber,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!query || haystack.includes(query.toLocaleLowerCase())) &&
      (!scope || processLabel(p) === scope) &&
      (!municipality || p.scenario.municipality === municipality) &&
      (!type || p.scenario.processType === type) &&
      (!chamber ||
        (work.chamber || p.recommendation?.chamber || "A definir") === chamber)
    );
  });
  const api: WorkspaceApi = {
    portfolio,
    dark,
    act,
    decide,
    issue,
    openProcess: (id) => {
      setDetailId(id);
      onSelectProcess(id);
      onNavigate("processes");
    },
    openRules: () => {
      setDataTab("rules");
      onNavigate("data");
    },
    assign: (id) => setRequest({ kind: "assign", id }),
    requestDocuments: (id, documentId) =>
      setRequest(
        documentId
          ? { kind: "documents", id, documentId }
          : { kind: "documents", id },
      ),
  };
  const filters = [municipality, type, chamber, scope].filter(Boolean);
  return (
    <WorkspaceContext.Provider value={api}>
      <main ref={pageRef} className="module-page workspace-page">
        <header className="workspace-page-header">
          <div>
            <span>LicenGeo SP / ambiente demonstrativo</span>
            <h2>{TITLES[module]}</h2>
          </div>
          <button
            className="button button--secondary"
            onClick={() => onNavigate("operation")}
          >
            Centro de Controle <ArrowRight />
          </button>
        </header>
        <div className="workspace-filterbar">
          <label className="workspace-search">
            <MagnifyingGlass />
            <input
              aria-label="Pesquisar nesta página"
              placeholder={
                module === "agents"
                  ? "Nome ou especialidade"
                  : "Processo, requerente ou município"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {module !== "agents" && module !== "layers" ? (
            <details className="workspace-filters">
              <summary>
                <Funnel /> Filtros{" "}
                {filters.length > 0 ? "(" + filters.length + ")" : ""}
              </summary>
              <div>
                <FilterSelect
                  label="Município"
                  value={municipality}
                  onChange={setMunicipality}
                  items={portfolio.processes.map(
                    (p) => p.scenario.municipality,
                  )}
                />
                <FilterSelect
                  label="Tipo de processo"
                  value={type}
                  onChange={setType}
                  items={portfolio.processes.map((p) => p.scenario.processType)}
                />
                <FilterSelect
                  label="Câmara"
                  value={chamber}
                  onChange={setChamber}
                  items={portfolio.processes.map(
                    (p) =>
                      workflowFor(p).chamber ||
                      p.recommendation?.chamber ||
                      "A definir",
                  )}
                />
                <FilterSelect
                  label="Estado"
                  value={scope}
                  onChange={setScope}
                  items={portfolio.processes.map(processLabel)}
                />
              </div>
            </details>
          ) : null}
          <span>
            {module === "layers"
              ? "Acervo territorial fornecido"
              : module === "agents"
                ? "20 especialistas digitais"
                : processes.length + " processos"}
          </span>
          {query || filters.length ? (
            <button
              className="icon-button"
              title="Limpar filtros"
              aria-label="Limpar filtros"
              onClick={() => {
                setQuery("");
                setScope("");
                setMunicipality("");
                setType("");
                setChamber("");
              }}
            >
              <X />
            </button>
          ) : null}
        </div>
        {filters.length ? (
          <div className="active-filters">
            {filters.map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
        ) : null}
        {module === "processes" || module === "process" ? (
          <ProcessWorkspace
            processes={processes}
            detailId={
              module === "process" ? portfolio.selectedProcessId : detailId
            }
            onCloseDetail={() => {
              setDetailId(null);
              onNavigate("processes");
            }}
          />
        ) : module === "agents" ? (
          <AgentWorkspace query={query} />
        ) : module === "data" ? (
          <DataWorkspace
            key={dataTab}
            processes={processes}
            initialTab={dataTab}
          />
        ) : module === "performance" || module === "indicators" ? (
          <AnalyticsWorkspace key="performance" processes={processes} />
        ) : module === "reports" ? (
          <ReportWorkspace processes={processes} />
        ) : module === "audit" ? (
          <AuditWorkspace processes={processes} />
        ) : (
          <LayersContent query={query} />
        )}
        {request ? (
          <WorkflowDialog
            key={request.id + request.kind}
            request={request}
            close={() => setRequest(null)}
          />
        ) : null}
      </main>
    </WorkspaceContext.Provider>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly items: readonly string[];
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Todos</option>
        {[...new Set(items)].map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}
