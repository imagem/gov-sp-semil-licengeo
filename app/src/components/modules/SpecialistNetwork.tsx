import {
  ArrowsClockwise,
  CheckCircle,
  CirclesFour,
  GearSix,
  GitDiff,
  Lightning,
  Plus,
  SlidersHorizontal,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import type {
  PortfolioProjection,
  SpecialistDepartment,
  SpecialistId,
  SpecialistLoadProjection,
} from "../../domain/model";

interface SpecialistNetworkProps {
  readonly portfolio: PortfolioProjection;
  readonly query: string;
}

type InspectorMode = "overview" | "instructions" | "triggers" | "capacity" | "new" | "compare";

const DEPARTMENTS = [
  { id: "entry-quality", label: "Entrada e qualidade", short: "Entrada" },
  { id: "territorial-intelligence", label: "Inteligência territorial", short: "Território" },
  { id: "regulation-coordination", label: "Regulação e articulação", short: "Regulação" },
  { id: "decision-operation", label: "Decisão e operação", short: "Decisão" },
] satisfies readonly { readonly id: SpecialistDepartment; readonly label: string; readonly short: string }[];

export function SpecialistNetwork({ portfolio, query }: SpecialistNetworkProps) {
  const [selectedId, setSelectedId] = useState<SpecialistId>("ESP-05");
  const [department, setDepartment] = useState<SpecialistDepartment | "all">("all");
  const [liveMode, setLiveMode] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("overview");
  const [draftInstruction, setDraftInstruction] = useState("");
  const [draftStatus, setDraftStatus] = useState("Nenhuma alteração local");
  const [capacityDraft, setCapacityDraft] = useState(2);
  const [newDrafts, setNewDrafts] = useState(0);

  const selected = portfolio.specialists.find((item) => item.specialist.id === selectedId) ?? portfolio.specialists[0];
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleSpecialists = useMemo(() => portfolio.specialists.filter((item) => {
    const matchesDepartment = department === "all" || item.specialist.department === department;
    const matchesQuery = normalizedQuery.length === 0 || `${item.specialist.id} ${item.specialist.name} ${item.specialist.triggers.join(" ")}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    return matchesDepartment && matchesQuery;
  }), [department, normalizedQuery, portfolio.specialists]);

  useEffect(() => {
    if (!selected) return;
    setDraftInstruction(`Objetivo: ${selected.specialist.name}.\nEntradas permitidas: eventos e evidências vinculados ao processo.\nSaída: resultado estruturado com fonte, horário e limite.`);
    setCapacityDraft(selected.specialist.capacity);
    setDraftStatus("Nenhuma alteração local");
  }, [selected]);

  if (!selected) return null;

  function openInspector(mode: InspectorMode) {
    setInspectorMode(mode);
  }

  return (
    <section className="specialist-network" aria-label="Grafo de especialidades em tempo real">
      <div className="specialist-department-legend" aria-label="Quatro áreas dos vinte especialistas digitais">20 especialistas digitais em 4 áreas: {DEPARTMENTS.map((item) => <span className={`department-tone department-tone--${item.id}`} key={item.id}>{item.label}</span>)}</div>
      <div className="specialist-network__toolbar">
        <label>
          <span>Departamento</span>
          <select value={department} onChange={(event) => setDepartment(readDepartment(event.currentTarget.value))}>
            <option value="all">Todos os departamentos</option>
            {DEPARTMENTS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className="network-mode" role="group" aria-label="Modo do grafo">
          <button className={liveMode ? "is-selected" : ""} type="button" aria-pressed={liveMode} onClick={() => setLiveMode(true)}><Lightning /> Ao vivo</button>
          <button className={!liveMode ? "is-selected" : ""} type="button" aria-pressed={!liveMode} onClick={() => setLiveMode(false)}><CirclesFour /> Topologia</button>
        </div>
        <button type="button" onClick={() => openInspector("instructions")}><GearSix /> Editar instruções</button>
        <button type="button" onClick={() => openInspector("triggers")}><ArrowsClockwise /> Gatilhos</button>
        <button type="button" onClick={() => openInspector("new")}><Plus /> Novo especialista</button>
        <button type="button" onClick={() => openInspector("compare")}><GitDiff /> Comparar versão</button>
        <button type="button" onClick={() => openInspector("capacity")}><SlidersHorizontal /> Capacidade</button>
      </div>

      <div className="specialist-network__workspace">
        <div className="specialist-graph" data-mode={liveMode ? "live" : "topology"}>
          <header>
            <span><i aria-hidden="true" /> {portfolio.activeProcesses.length} processos em triagem</span>
            <span>{portfolio.specialists.filter((item) => item.status === "saturated").length} saturados</span>
            <span>{portfolio.specialists.reduce((total, item) => total + item.activeAssignments.length, 0)} alocações ativas</span>
          </header>
          <div className="specialist-graph__departments">
            {DEPARTMENTS.filter((item) => department === "all" || item.id === department).map((item) => {
              const loads = visibleSpecialists.filter((load) => load.specialist.department === item.id);
              return <section className="specialist-department" data-department={item.id} key={item.id} aria-labelledby={`department-${item.id}`}>
                <header id={`department-${item.id}`}><strong>{item.label}</strong><span>{loads.length}</span></header>
                <div>
                  {loads.map((load) => <SpecialistNode load={load} selected={load.specialist.id === selected.specialist.id} liveMode={liveMode} onSelect={() => { setSelectedId(load.specialist.id); setInspectorMode("overview"); }} key={load.specialist.id} />)}
                </div>
              </section>;
            })}
          </div>
        </div>

        <aside className="specialist-inspector" aria-label="Inspetor do especialista selecionado">
          <header>
            <span className={`specialist-inspector__state specialist-inspector__state--${selected.status}`}><i aria-hidden="true" /> {statusLabel(selected.status)}</span>
            <strong>{selected.specialist.id}</strong>
            <h3>{inspectorMode === "new" ? "Novo especialista" : selected.specialist.name}</h3>
          </header>
          {inspectorMode === "overview" ? <Overview selected={selected} /> : null}
          {inspectorMode === "instructions" ? <div className="specialist-editor"><label>Instruções em rascunho<textarea value={draftInstruction} onChange={(event) => { setDraftInstruction(event.currentTarget.value); setDraftStatus("Alteração ainda não salva"); }} /></label><button type="button" onClick={() => setDraftStatus("Rascunho local salvo. Operação atual preservada.")}>Salvar rascunho</button><small>{draftStatus}</small></div> : null}
          {inspectorMode === "triggers" ? <div className="specialist-trigger-list"><strong>Eventos que convocam este especialista</strong>{selected.specialist.triggers.map((trigger) => <label key={trigger}><input type="checkbox" defaultChecked /> <span>{trigger}</span></label>)}<small>Alterações ficam isoladas até publicação no laboratório.</small></div> : null}
          {inspectorMode === "capacity" ? <div className="specialist-editor"><label>Capacidade simultânea<input type="range" min="1" max="4" value={capacityDraft} onChange={(event) => setCapacityDraft(Number(event.currentTarget.value))} /></label><strong>{capacityDraft} processos</strong><button type="button" onClick={() => setDraftStatus(`Capacidade ${capacityDraft} salva em rascunho.`)}>Salvar simulação</button><small>{draftStatus}</small></div> : null}
          {inspectorMode === "compare" ? <div className="version-comparison"><strong>Publicada v2026.08</strong><p>{selected.specialist.name}. Capacidade {selected.specialist.capacity}.</p><strong>Rascunho local</strong><p>{selected.specialist.name}. Capacidade {capacityDraft}. {draftInstruction === "" ? "Sem instruções." : "Instruções editadas disponíveis para revisão."}</p><small>Nenhuma diferença foi aplicada à apresentação corrente.</small></div> : null}
          {inspectorMode === "new" ? <form className="specialist-editor" onSubmit={(event) => { event.preventDefault(); setNewDrafts((current) => current + 1); }}><label>Nome<input required placeholder="Especialidade" /></label><label>Departamento<select defaultValue="territorial-intelligence">{DEPARTMENTS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>Gatilho inicial<input required placeholder="Evento de convocação" /></label><button type="submit">Criar rascunho</button><small>{newDrafts} rascunhos criados nesta sessão. Nenhum está publicado.</small></form> : null}
        </aside>
      </div>
    </section>
  );
}

function SpecialistNode({ load, selected, liveMode, onSelect }: { readonly load: SpecialistLoadProjection; readonly selected: boolean; readonly liveMode: boolean; readonly onSelect: () => void }) {
  const assignments = load.activeAssignments.map((item) => item.processId);
  const state = liveMode ? load.status : "available";
  return <button className={`specialist-node specialist-node--${state}${selected ? " is-selected" : ""}`} type="button" aria-pressed={selected} title={`${load.specialist.name}. ${statusLabel(load.status)}. ${assignments.join(", ") || "Sem processo ativo"}.`} onClick={onSelect}>
    <span><i aria-hidden="true" /><strong>{load.specialist.id}</strong><b>{load.activeAssignments.length}/{load.specialist.capacity}</b></span>
    <small>{load.specialist.name}</small>
    {liveMode && assignments.length > 0 ? <em>{assignments.join(" · ")}</em> : <em>{load.specialist.triggers[0]}</em>}
  </button>;
}

function Overview({ selected }: { readonly selected: SpecialistLoadProjection }) {
  return <div className="specialist-overview">
    <dl><div><dt>Capacidade</dt><dd>{selected.activeAssignments.length} de {selected.specialist.capacity}</dd></div><div><dt>Fila</dt><dd>{selected.queuedAssignments.length}</dd></div></dl>
    <section><strong>Atuação corrente</strong>{selected.activeAssignments.length === 0 ? <p>Disponível para nova alocação.</p> : selected.activeAssignments.map((assignment) => <p key={assignment.requestId}><UsersThree /> <span><strong>{assignment.processId}</strong><small>Conclusão no passo {assignment.completesAtTick}</small></span></p>)}</section>
    {selected.queuedAssignments.length > 0 ? <section><strong>Solicitações em espera</strong>{selected.queuedAssignments.map((assignment) => <p key={assignment.requestId}><WarningCircle /><span><strong>{assignment.processId}</strong><small>aguardando capacidade</small></span></p>)}</section> : null}
    <section><strong>Gatilhos publicados</strong>{selected.specialist.triggers.map((trigger) => <p key={trigger}><CheckCircle /><span>{trigger}</span></p>)}</section>
  </div>;
}

function statusLabel(status: SpecialistLoadProjection["status"]) {
  switch (status) {
    case "available": return "Disponível";
    case "active": return "Em atividade";
    case "shared": return "Atendimento simultâneo";
    case "saturated": return "Saturado";
    default: { const exhaustive: never = status; return exhaustive; }
  }
}

function readDepartment(value: string): SpecialistDepartment | "all" {
  switch (value) {
    case "all":
    case "entry-quality":
    case "territorial-intelligence":
    case "regulation-coordination":
    case "decision-operation":
      return value;
    default:
      return "all";
  }
}
