import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { X } from "@phosphor-icons/react";
import { PHASES, PHASE_NAMES, processLabel } from "../../app/workspace-data";
import type { ProcessExecutionProjection, SpecialistLoadProjection } from "../../domain/model";
import { DEPARTMENT_LABELS } from "../operation/ProcessOwnership";
import { SpecialistNetwork } from "./SpecialistNetwork";
import { useWorkspace } from "./workspace-context";

type GraphScope = "process" | "portfolio";
type FlowCardKind = "process" | "phase" | "specialist" | "department";
type FlowCardStatus = "queued" | "active" | "complete" | "waiting" | "idle" | "saturated";

interface FlowCardData extends Record<string, unknown> {
  readonly kind: FlowCardKind;
  readonly title: string;
  readonly subtitle: string;
  readonly eyebrow: string;
  readonly meta: string;
  readonly badge: string;
  readonly status: FlowCardStatus;
}

const CARD_TYPES = {
  flowCard: FlowCardNode,
  departmentTitle: ({ data }: NodeProps<Node<FlowCardData>>) => <h3 className="flow-department-title">{data.title}</h3>,
};

const DEPARTMENT_COLORS: Record<string, string> = {
  "entry-quality": "#187fa8",
  "territorial-intelligence": "#19865e",
  "regulation-coordination": "#9255bb",
  "decision-operation": "#cf6635",
};

const CARD_SIZE = {
  process: { width: 292, height: 114 },
  phase: { width: 250, height: 104 },
  specialist: { width: 306, height: 146 },
  department: { width: 300, height: 46 },
} satisfies Readonly<Record<FlowCardKind, { readonly width: number; readonly height: number }>>;

export function AgentWorkspace({ query }: { readonly query: string }) {
  const api = useWorkspace();
  const [view, setView] = useState("graph");
  return (
    <>
      <div className="workspace-tabs">
        <button
          aria-pressed={view === "directory"}
          onClick={() => setView("directory")}
        >
          Diretório
        </button>
        <button
          aria-pressed={view === "graph"}
          onClick={() => setView("graph")}
        >
          Fluxo
        </button>
      </div>
      {view === "directory" ? (
        <SpecialistNetwork portfolio={api.portfolio} query={query} />
      ) : (
        <AgentGraph query={query} />
      )}
    </>
  );
}

function AgentGraph({ query }: { readonly query: string }) {
  const api = useWorkspace();
  const [scope, setScope] = useState<GraphScope>("process");
  const availableProcesses = useMemo(
    () =>
      api.portfolio.processes.filter(
        (process) => process.status !== "triage-completed",
      ),
    [api.portfolio.processes],
  );
  const [processId, setProcessId] = useState(
    api.portfolio.selectedProcessId ??
      availableProcesses[0]?.scenario.id ??
      api.portfolio.processes[0]?.scenario.id ??
      "",
  );
  const [department, setDepartment] = useState("all");
  const surface = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState("");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!availableProcesses.length) return;
    const selectedStillOpen = availableProcesses.some(
      (process) => process.scenario.id === processId,
    );
    if (!selectedStillOpen) {
      setProcessId(availableProcesses[0]?.scenario.id ?? "");
      setSelected("");
    }
  }, [availableProcesses, processId]);

  const { nodes, edges } = useMemo(() => {
    const processes =
      scope === "process"
        ? api.portfolio.processes.filter((process) => process.scenario.id === processId)
        : availableProcesses;
    return buildGraph({
      processes,
      processSlots: api.portfolio.processes.map((item) => item.scenario.id),
      specialists: api.portfolio.specialists,
      scope,
      department,
      query,
      animated: !reduced,
    });
  }, [api.portfolio, availableProcesses, scope, processId, department, query, reduced]);

  const specialist = api.portfolio.specialists.find(
    (item) => item.specialist.id === selected,
  );
  const process = api.portfolio.processes.find(
    (item) =>
      item.scenario.id === selected ||
      PHASES.some((phase) => item.scenario.id + "-" + phase === selected),
  );

  return (
    <div className="agent-graph-workspace">
      <div className="graph-toolbar">
        <select
          aria-label="Escopo do grafo"
          value={scope}
          onChange={(event) => {
            setScope(event.target.value as GraphScope);
            setSelected("");
          }}
        >
          <option value="process">Processo selecionado</option>
          <option value="portfolio">Operação completa</option>
        </select>
        {scope === "process" ? (
          <select
            aria-label="Processo do grafo"
            value={processId}
            onChange={(event) => {
              setProcessId(event.target.value);
              setSelected("");
            }}
          >
            {(availableProcesses.length ? availableProcesses : api.portfolio.processes).map((item) => (
              <option key={item.scenario.id} value={item.scenario.id}>
                {item.scenario.id} · {item.scenario.municipality}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Departamento do grafo"
          value={department}
          onChange={(event) => {
            setDepartment(event.target.value);
            setSelected("");
          }}
        >
          <option value="all">Todos os departamentos</option>
          {Object.entries(DEPARTMENT_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="graph-surface" ref={surface}>
        <ReactFlow
          key={`${scope}-${scope === "process" ? processId : "all"}-${department}-${query}`}
          nodes={nodes}
          edges={edges}
          nodeTypes={CARD_TYPES}
          defaultViewport={{ x: 36, y: 28, zoom: scope === "portfolio" ? 0.78 : 0.92 }}
          fitView={false}
          onInit={(instance) => {
            const width = Math.max(...nodes.map((node) => node.parentId ? 0 : node.position.x + Number(node.style?.width ?? 292)), 360);
            void instance.setViewport({ x: 24, y: 24, zoom: Math.min(0.92, Math.max(0.15, ((surface.current?.clientWidth ?? 1000) - 48) / width)) });
          }}
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.15}
          maxZoom={1.25}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll
          elementsSelectable
          colorMode={api.dark ? "dark" : "light"}
          onNodeClick={(_, node) => setSelected(node.id)}
        >
          <Background gap={24} size={1} />
          <MiniMap
            pannable
            zoomable
            nodeColor={miniMapNodeColor}
            nodeStrokeWidth={3}
          />
          <Controls showInteractive={false} />
        </ReactFlow>
        {specialist || process ? (
          <aside className="graph-inspector">
            <header>
              <h3>{specialist?.specialist.name ?? process?.scenario.id}</h3>
              <button
                className="icon-button"
                aria-label="Fechar inspeção do nó"
                onClick={() => setSelected("")}
              >
                <X />
              </button>
            </header>
            {specialist ? (
              <>
                <p>{DEPARTMENT_LABELS[specialist.specialist.department]}</p>
                <strong>
                  {specialist.activeAssignments.length}/
                  {specialist.specialist.capacity} posições ocupadas
                </strong>
                <p>
                  {specialist.queuedAssignments.length} aguardando capacidade
                </p>
                {[
                  ...specialist.activeAssignments,
                  ...specialist.queuedAssignments,
                ].map((assignment) => (
                  <button
                    className="text-action"
                    key={assignment.requestId}
                    onClick={() => api.openProcess(assignment.processId)}
                  >
                    {assignment.processId} · Abrir dossiê
                  </button>
                ))}
                {api.portfolio.processes.flatMap((item) =>
                  item.branches
                    .filter(
                      (branch) =>
                        branch.specialistId === specialist.specialist.id &&
                        branch.status !== "waiting",
                    )
                    .map((branch) => (
                      <p key={item.scenario.id + branch.id}>
                        <strong>{branch.title}</strong>
                        <br />
                        {branch.result ?? "Saída ainda não produzida"}
                      </p>
                    )),
                )}
              </>
            ) : process ? (
              <>
                <p>{process.scenario.title}</p>
                <p>
                  {process.evidence.length} evidências ·{" "}
                  {process.completedStages.length}/6 fases
                </p>
                <p>
                  {process.currentStage
                    ? "Fase atual: " +
                      PHASE_NAMES[PHASES.indexOf(process.currentStage)]
                    : "Aguardando próxima ação"}
                </p>
                <button
                  className="button button--primary"
                  onClick={() => api.openProcess(process.scenario.id)}
                >
                  Abrir dossiê
                </button>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function buildGraph({
  processes,
  processSlots,
  specialists,
  scope,
  department,
  query,
  animated,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
  readonly processSlots: readonly string[];
  readonly specialists: readonly SpecialistLoadProjection[];
  readonly scope: GraphScope;
  readonly department: string;
  readonly query: string;
  readonly animated: boolean;
}): { readonly nodes: Node<FlowCardData>[]; readonly edges: Edge[] } {
  const nodes: Node<FlowCardData>[] = [];
  const edges: Edge[] = [];
  const processY = 34;
  const processGap = 326;
  const departmentY = scope === "process" ? 236 : 34 + Math.ceil(processSlots.length / 5) * 150 + 72;
  const departmentGap = 382;
  const queryText = query.toLocaleLowerCase();

  processes.forEach((process) => {
    const slot = scope === "process" ? 0 : processSlots.indexOf(process.scenario.id);
    nodes.push(processNode(process, { x: (slot % 5) * processGap, y: processY + Math.floor(slot / 5) * 150 }));
  });

  let laneIndex = 0;
  Object.entries(DEPARTMENT_LABELS).forEach(([id, label]) => {
    if (department !== "all" && department !== id) return;
    const departmentSpecialists = specialists.filter(
      (load) =>
        load.specialist.department === id &&
        (scope === "portfolio" ||
          processes.some((process) =>
            process.scenario.branches.some(
              (branch) => branch.specialistId === load.specialist.id,
            ),
          )) &&
        (load.specialist.name + " " + load.specialist.id + " " + load.specialist.triggers.join(" "))
          .toLocaleLowerCase()
          .includes(queryText),
    );
    if (!departmentSpecialists.length) return;

    const laneHeight = 84 + departmentSpecialists.length * 174;
    const laneX = laneIndex * departmentGap;
    nodes.push({
      id: "department-" + id,
      type: "group",
      position: { x: laneX, y: departmentY },
      data: {
        kind: "department",
        title: label,
        subtitle: "",
        eyebrow: "",
        meta: "",
        badge: "",
        status: "idle",
      },
      style: { width: 360, height: laneHeight },
      className: "flow-lane",
      selectable: false,
    });
    nodes.push({
      id: "label-" + id,
      parentId: "department-" + id,
      position: { x: 30, y: 14 },
      type: "departmentTitle",
      style: CARD_SIZE.department,
      data: {
        kind: "department",
        title: label,
        subtitle: `${departmentSpecialists.length} agentes`,
        eyebrow: "Departamento",
        meta: "",
        badge: "",
        status: "idle",
      },
      className: "flow-lane-title",
      selectable: false,
      draggable: false,
    });

    departmentSpecialists.forEach((load, index) => {
      nodes.push({
        id: load.specialist.id,
        parentId: "department-" + id,
        type: "flowCard",
        position: { x: 22, y: 70 + index * 174 },
        style: CARD_SIZE.specialist,
        data: {
          kind: "specialist",
          title: load.specialist.name,
          subtitle: load.specialist.triggers.join(" · "),
          eyebrow: load.specialist.id,
          meta: `${load.activeAssignments.length}/${load.specialist.capacity} ativos · ${load.queuedAssignments.length} em fila`,
          badge: specialistStatusLabel(load),
          status: specialistStatus(load),
        },
      });

      const visibleProcessIds = new Set(processes.map((process) => process.scenario.id));
      load.activeAssignments
        .filter((assignment) => visibleProcessIds.has(assignment.processId))
        .forEach((assignment) => {
          edges.push(edge({
            id: assignment.processId + "-" + assignment.requestId,
            source: assignment.processId,
            target: load.specialist.id,
            animated,
            label: null,
            status: "active",
            color: DEPARTMENT_COLORS[id] ?? "#187fa8",
          }));
        });
    });

    laneIndex += 1;
  });

  return {
    nodes: nodes.map((node) => ({
      ...node,
      width: Number(node.style?.width),
      height: Number(node.style?.height),
    })),
    edges,
  };
}

function processNode(process: ProcessExecutionProjection, position: Node<FlowCardData>["position"]): Node<FlowCardData> {
  const active = process.status === "in-analysis";
  return {
    id: process.scenario.id,
    type: "flowCard",
    position,
    style: CARD_SIZE.process,
    data: {
      kind: "process",
      title: process.scenario.id,
      subtitle: process.scenario.municipality,
      eyebrow: process.scenario.processType,
      meta: process.scenario.title,
      badge: processLabel(process),
      status: active ? "active" : process.status === "queued" ? "queued" : "complete",
    },
  };
}

function edge({
  id,
  source,
  target,
  animated,
  label,
  status,
  color,
}: {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly animated: boolean;
  readonly label?: string | null;
  readonly status: "active" | "queued" | "resolved" | "waiting";
  readonly color: string;
}): Edge {
  return {
    id,
    source,
    target,
    animated,
    zIndex: 1000,
    ...(label ? { label } : {}),
    type: "default",
    markerEnd: { type: MarkerType.ArrowClosed, color },
    className: "flow-edge-" + status,
    style: { stroke: color, strokeWidth: 2.8 },
  };
}

function FlowCardNode({ data, selected }: NodeProps<Node<FlowCardData>>) {
  const isProcess = data.kind === "process";
  const isSpecialist = data.kind === "specialist";
  return (
    <article className={`flow-card flow-card--${data.kind} flow-card--${data.status}${selected ? " is-selected" : ""}`}>
      {isSpecialist ? <Handle className="flow-card__handle" type="target" position={Position.Top} /> : null}
      <header>
        <span>{data.eyebrow}</span>
        {data.badge ? <b>{data.badge}</b> : null}
      </header>
      <strong>{data.title}</strong>
      <small>{data.subtitle}</small>
      {data.meta ? <p>{data.meta}</p> : null}
      {isProcess ? <Handle className="flow-card__handle" type="source" position={Position.Bottom} /> : null}
    </article>
  );
}

function specialistStatus(load: SpecialistLoadProjection): FlowCardStatus {
  if (load.activeAssignments.length > 0) return "active";
  if (load.queuedAssignments.length > 0 || load.status === "saturated") return "saturated";
  return "idle";
}

function specialistStatusLabel(load: SpecialistLoadProjection) {
  if (load.activeAssignments.length > 0) return "Ativo";
  if (load.queuedAssignments.length > 0) return "Fila";
  if (load.status === "saturated") return "Saturado";
  return "Disponível";
}

function branchStatusLabel(status: "waiting" | "queued" | "active" | "resolved") {
  switch (status) {
    case "waiting": return "Aguardando";
    case "queued": return "Em fila";
    case "active": return "Em execução";
    case "resolved": return "Concluído";
    default: { const exhaustive: never = status; return exhaustive; }
  }
}

function miniMapNodeColor(node: Node<FlowCardData>) {
  if (node.data.kind === "process") return "#c99016";
  if (node.data.kind === "phase") return "#d99106";
  if (node.data.kind === "specialist") return "#3f83c7";
  return "#9fc4e8";
}
