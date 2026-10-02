import { OPERATION_SCENARIOS } from "../app/operation-scenarios";
import { SPECIALISTS } from "../app/specialists";
import { currentExecutionEvents, recordWorkflow, workflowFor } from "./workflow";
import { recommendationWithPublishedRules } from "./rule-comparison";
import { resolvePortfolioSelection } from "./focus-selection";
import type {
  AgentStage,
  BranchProjection,
  BranchRequestTemplate,
  Conflict,
  Dossier,
  PortfolioEvent,
  PortfolioProjection,
  PortfolioState,
  ProcessExecutionProjection,
  HumanDecisionCommand,
  OperationProjection,
  RecordedHumanDecision,
  Recommendation,
  ScenarioEvent,
  SpecialistId,
  SpecialistLoadProjection,
} from "./model";

const PRESENTATION_START = "2026-09-03T14:06:52.000Z";
const TICK_SECONDS = 3;
const MAX_ACTIVE_PROCESSES = 3;

const STAGES = [
  "receiving",
  "geometry",
  "territorial-analysis",
  "conformity",
  "routing",
  "opinion",
] satisfies readonly AgentStage[];

const STAGE_DURATION = {
  receiving: 1,
  geometry: 2,
  "territorial-analysis": 4,
  conformity: 2,
  routing: 2,
  opinion: 2,
} satisfies Readonly<Record<AgentStage, number>>;

export function createPortfolio(): PortfolioState {
  return {
    tick: 0,
    clock: PRESENTATION_START,
    selectedProcessId: null,
    pinnedProcessId: null,
    events: [],
  };
}

export function selectPortfolioProcess(
  state: PortfolioState,
  processId: string,
): PortfolioState {
  const processExists = OPERATION_SCENARIOS.some((scenario) => scenario.id === processId);
  return processExists ? { ...state, selectedProcessId: processId } : state;
}

export function pinPortfolioProcess(state: PortfolioState, processId: string): PortfolioState {
  return OPERATION_SCENARIOS.some((scenario) => scenario.id === processId)
    ? { ...state, selectedProcessId: processId, pinnedProcessId: processId }
    : state;
}

export function releasePortfolioProcess(state: PortfolioState): PortfolioState {
  return { ...state, pinnedProcessId: null };
}

export function recordPortfolioHumanDecision(
  state: PortfolioState,
  command: HumanDecisionCommand,
): PortfolioState {
  const projection = projectSelectedOperation(state);
  if (projection.status !== "human-decision-required" || projection.recommendation === null) {
    return state;
  }

  const decision = createRecordedDecision({
    command,
    recommendation: projection.recommendation,
    decidedAt: state.clock,
  });
  const updated: PortfolioState = {
    ...state,
    events: [...state.events, {
      kind: "human-decision-recorded",
      processId: projection.scenario.id,
      decision,
      tick: state.tick,
      occurredAt: state.clock,
    }],
  };
  if (command.kind !== "request-complement") return updated;
  const process = projectPortfolio(updated).processes.find((p) => p.scenario.id === projection.scenario.id);
  return process ? recordWorkflow(updated, process, { kind: "request-documents", documentIds: ["DOC-4"] }, command.justification) : updated;
}

export function issuePortfolioDossier(
  state: PortfolioState,
  author: string,
): PortfolioState {
  const projection = projectSelectedOperation(state);
  if (projection.status !== "opinion-ready") return state;

  return {
    ...state,
    events: [...state.events, {
      kind: "dossier-issued",
      processId: projection.scenario.id,
      dossier: {
        identifier: `DOS-${projection.scenario.id.replace("PROC-", "")}-R${1 + state.events.filter((e) => e.processId === projection.scenario.id && e.kind === "dossier-issued").length}`,
        issuedAt: state.clock,
        issuedBy: author,
        evidenceCount: projection.evidence.length,
        ruleVersion: projection.recommendation?.ruleVersion ?? "v2026.08",
      },
      tick: state.tick,
      occurredAt: state.clock,
    }],
  };
}

export function advancePortfolio(state: PortfolioState): PortfolioState {
  const tick = state.tick + 1;
  const occurredAt = timeForTick(tick);
  let events = [...state.events];

  events.push(...resolveCompletedBranches({ events: currentExecutionEvents(events), tick, occurredAt }));

  const projectionAfterResolution = projectPortfolio({
    ...state,
    tick,
    clock: occurredAt,
    events,
  });
  const openSlots = Math.max(
    0,
    MAX_ACTIVE_PROCESSES - projectionAfterResolution.activeProcesses.length,
  );
  const arrivals = projectionAfterResolution.queuedProcesses
    .filter((process) => process.scenario.arrivalTick <= tick && workflowFor(process).missing.length === 0)
    .slice(0, openSlots);

  for (const process of arrivals) {
    events.push(
      { kind: "process-received", processId: process.scenario.id, tick, occurredAt },
      {
        kind: "stage-started",
        processId: process.scenario.id,
        stage: "receiving",
        tick,
        occurredAt,
      },
    );
  }

  events.push(...requestBranchesForActiveStages({ events: currentExecutionEvents(events), tick, occurredAt }));
  events.push(...allocatePendingRequests({ events: currentExecutionEvents(events), tick, occurredAt }));
  events.push(...completeEligibleStages({ events, tick, occurredAt }));

  const firstArrival = arrivals[0];
  const nextProjection = projectPortfolio({
    tick,
    clock: occurredAt,
    selectedProcessId: state.selectedProcessId,
    pinnedProcessId: state.pinnedProcessId,
    events,
  });
  const selectedProcessId = resolvePortfolioSelection(
    state.pinnedProcessId,
    state.selectedProcessId,
    nextProjection.activeProcesses.map((process) => process.scenario.id),
    firstArrival?.scenario.id ?? null,
    nextProjection.processes.map((process) => process.scenario.id),
  );

  return {
    tick,
    clock: occurredAt,
    selectedProcessId,
    pinnedProcessId: state.pinnedProcessId && nextProjection.processes.some((process) => process.scenario.id === state.pinnedProcessId) ? state.pinnedProcessId : null,
    events,
  };
}

export function projectPortfolio(state: PortfolioState): PortfolioProjection {
  const processes = OPERATION_SCENARIOS.map((scenario) => projectProcess(state.events, scenario.id));
  const queuedProcesses = processes.filter((process) => process.status === "queued");
  const activeProcesses = processes.filter((process) => process.status === "in-analysis" && workflowFor(process).missing.length === 0);
  const completedProcesses = processes.filter((process) => process.status === "triage-completed");

  return {
    tick: state.tick,
    clock: state.clock,
    selectedProcessId: state.selectedProcessId,
    pinnedProcessId: state.pinnedProcessId,
    processes,
    queuedProcesses,
    activeProcesses,
    completedProcesses,
    specialists: SPECIALISTS.map((specialist) => projectSpecialistLoad(currentExecutionEvents(state.events), specialist.id)),
  };
}

export function projectSelectedOperation(state: PortfolioState): OperationProjection {
  const portfolio = projectPortfolio(state);
  const selectedProcess = portfolio.processes.find(
    (process) => process.scenario.id === portfolio.selectedProcessId,
  ) ?? portfolio.activeProcesses[0] ?? portfolio.queuedProcesses[0] ?? portfolio.completedProcesses[0];

  if (!selectedProcess) {
    throw new Error("A simulação precisa de ao menos um cenário operacional.");
  }

  const scenarioIndex = OPERATION_SCENARIOS.findIndex(
    (scenario) => scenario.id === selectedProcess.scenario.id,
  );
  const scenarioEvents = currentExecutionEvents(selectedProcess.events).flatMap(toScenarioEvent);
  const evidence = scenarioEvents.flatMap(
    (event) => event.kind === "evidence-recorded" ? [event.evidence] : [],
  );
  let conflict: Conflict | null = null;
  let recommendation: Recommendation | null = null;
  let humanDecision: RecordedHumanDecision | null = null;
  let dossier: Dossier | null = null;
  let decisionRequested = false;

  for (const event of scenarioEvents) {
    switch (event.kind) {
      case "conflict-detected":
        conflict = event.conflict;
        break;
      case "recommendation-created":
        recommendation = event.recommendation;
        break;
      case "human-decision-requested":
        decisionRequested = true;
        break;
      case "human-decision-recorded":
        humanDecision = event.decision;
        break;
      case "dossier-issued":
        dossier = event.dossier;
        break;
      case "stage-completed":
      case "evidence-recorded":
        break;
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  }
  const status = workflowFor(selectedProcess).missing.length ? "awaiting-complement" : dossier
    ? "opinion-issued"
    : humanDecision
      ? humanDecision.kind === "request-complement"
        ? "awaiting-complement"
        : "opinion-ready"
      : decisionRequested
        ? "human-decision-required"
        : "in-analysis";

  return {
    scenario: selectedProcess.scenario,
    scenarioIndex,
    scenarioTotal: OPERATION_SCENARIOS.length,
    completedScenarioIds: portfolio.completedProcesses
      .map((process) => process.scenario.id)
      .filter((processId) => processId !== selectedProcess.scenario.id),
    currentStage: selectedProcess.currentStage ?? (selectedProcess.status === "queued" ? "receiving" : "opinion"),
    completedStages: selectedProcess.completedStages,
    status,
    evidence,
    conflict,
    score: recommendation?.score ?? null,
    recommendation,
    humanDecision,
    dossier,
    otherProcessesAdvanced: portfolio.processes
      .filter((process) => process.scenario.id !== selectedProcess.scenario.id)
      .reduce((total, process) => total + process.completedStages.length, 0),
    clock: state.clock,
    events: scenarioEvents,
  };
}

function projectProcess(
  events: readonly PortfolioEvent[],
  processId: string,
): ProcessExecutionProjection {
  const scenario = OPERATION_SCENARIOS.find((candidate) => candidate.id === processId);
  if (!scenario) {
    throw new Error(`Processo desconhecido: ${processId}`);
  }

  const allProcessEvents = events.filter((event) => event.processId === processId);
  const processEvents = currentExecutionEvents(allProcessEvents);
  const received = processEvents.some((event) => event.kind === "process-received");
  const completedStages = STAGES.filter((stage) => processEvents.some(
    (event) => event.kind === "stage-completed" && event.stage === stage,
  ));
  const currentStage = STAGES.find((stage) => processEvents.some(
    (event) => event.kind === "stage-started" && event.stage === stage,
  ) && !completedStages.includes(stage)) ?? null;
  const status = !received
    ? "queued"
    : completedStages.length === STAGES.length
      ? "triage-completed"
      : "in-analysis";
  const evidence = processEvents.flatMap(
    (event) => event.kind === "evidence-recorded" ? [event.evidence] : [],
  );
  let conflict: Conflict | null = null;
  let recommendation: Recommendation | null = null;
  for (const event of processEvents) {
    if (event.kind === "conflict-detected") conflict = event.conflict;
    if (event.kind === "recommendation-created") recommendation = event.recommendation;
  }

  return {
    scenario,
    status,
    currentStage,
    completedStages,
    branches: scenario.branches.map((branch) => projectBranch(processEvents, branch)),
    evidence,
    conflict,
    recommendation,
    events: allProcessEvents,
  };
}

function projectBranch(
  events: readonly PortfolioEvent[],
  branch: BranchRequestTemplate,
): BranchProjection {
  const resolved = events.find(
    (event) => event.kind === "branch-resolved" && event.requestId === branch.id,
  );
  if (resolved?.kind === "branch-resolved") {
    return { ...branch, result: resolved.result, status: "resolved" };
  }

  const assigned = events.some(
    (event) => event.kind === "specialist-assigned" && event.requestId === branch.id,
  );
  if (assigned) return { ...branch, result: null, status: "active" };

  const queued = events.some(
    (event) => event.kind === "specialist-queued" && event.requestId === branch.id,
  );
  if (queued) return { ...branch, result: null, status: "queued" };

  return { ...branch, result: null, status: "waiting" };
}

function projectSpecialistLoad(
  events: readonly PortfolioEvent[],
  specialistId: SpecialistId,
): SpecialistLoadProjection {
  const specialist = SPECIALISTS.find((candidate) => candidate.id === specialistId);
  if (!specialist) {
    throw new Error(`Especialista desconhecido: ${specialistId}`);
  }

  const activeAssignments = events
    .filter(isSpecialistAssigned)
    .filter((event) => event.specialistId === specialistId)
    .filter((assignment) => !events.some(
      (event) => event.kind === "branch-resolved" && event.requestId === assignment.requestId,
    ))
    .map((assignment) => ({
      processId: assignment.processId,
      requestId: assignment.requestId,
      completesAtTick: assignment.completesAtTick,
    }));
  const queuedAssignments = events
    .filter(isSpecialistQueued)
    .filter((event) => event.specialistId === specialistId)
    .filter((queued) => !events.some(
      (event) => event.kind === "specialist-assigned" && event.requestId === queued.requestId,
    ))
    .map((queued) => ({ processId: queued.processId, requestId: queued.requestId }));
  const status = queuedAssignments.length > 0 || activeAssignments.length >= specialist.capacity
    ? "saturated"
    : activeAssignments.length >= 2
      ? "shared"
      : activeAssignments.length === 1
        ? "active"
        : "available";

  return { specialist, activeAssignments, queuedAssignments, status };
}

function resolveCompletedBranches({
  events,
  tick,
  occurredAt,
}: EventStep): readonly PortfolioEvent[] {
  const result: PortfolioEvent[] = [];
  const assignments = events
    .filter(isSpecialistAssigned)
    .filter((event) => event.completesAtTick <= tick)
    .filter((assignment) => !events.some(
      (event) => event.kind === "branch-resolved" && event.requestId === assignment.requestId,
    ));

  for (const assignment of assignments) {
    const scenario = OPERATION_SCENARIOS.find(
      (candidate) => candidate.id === assignment.processId,
    );
    const branch = scenario?.branches.find(
      (candidate) => candidate.id === assignment.requestId,
    );
    if (!branch) {
      throw new Error(`Ramificação desconhecida: ${assignment.requestId}`);
    }
    result.push({
      kind: "branch-resolved",
      processId: assignment.processId,
      requestId: assignment.requestId,
      specialistId: assignment.specialistId,
      result: branch.result,
      tick,
      occurredAt,
    });
  }

  return result;
}

function requestBranchesForActiveStages({
  events,
  tick,
  occurredAt,
}: EventStep): readonly PortfolioEvent[] {
  const result: PortfolioEvent[] = [];

  for (const scenario of OPERATION_SCENARIOS) {
    const process = projectProcess(events, scenario.id);
    if (process.status !== "in-analysis" || process.currentStage === null) continue;
    if (workflowFor(process).missing.length) continue;

    const branches = scenario.branches.filter(
      (branch) => branch.originStage === process.currentStage,
    );
    for (const branch of branches) {
      const alreadyRequested = events.some(
        (event) => event.kind === "specialist-requested" && event.requestId === branch.id,
      );
      if (alreadyRequested) continue;

      result.push({
        kind: "specialist-requested",
        processId: scenario.id,
        requestId: branch.id,
        specialistId: branch.specialistId,
        originStage: branch.originStage,
        mode: branch.mode,
        durationTicks: branch.durationTicks,
        title: branch.title,
        trigger: branch.trigger === branch.title ? `${scenario.focusLayerLabel}: ${branch.title}` : branch.trigger,
        tick,
        occurredAt,
      });
    }
  }

  return result;
}

function allocatePendingRequests({
  events,
  tick,
  occurredAt,
}: EventStep): readonly PortfolioEvent[] {
  const result: PortfolioEvent[] = [];
  const workingEvents = [...events];
  const pending = workingEvents
    .filter(isSpecialistRequested)
    .filter((request) => !workingEvents.some(
      (event) => event.kind === "specialist-assigned" && event.requestId === request.requestId,
    ));

  for (const request of pending) {
    if (workflowFor(projectProcess(events, request.processId)).missing.length) continue;
    const specialist = SPECIALISTS.find((candidate) => candidate.id === request.specialistId);
    if (!specialist) continue;

    const activeCount = workingEvents
      .filter(isSpecialistAssigned)
      .filter((event) => event.specialistId === specialist.id)
      .filter((assignment) => !workingEvents.some(
        (event) => event.kind === "branch-resolved" && event.requestId === assignment.requestId,
      )).length;

    if (activeCount < specialist.capacity) {
      const assignment: PortfolioEvent = {
        kind: "specialist-assigned",
        processId: request.processId,
        requestId: request.requestId,
        specialistId: request.specialistId,
        completesAtTick: tick + request.durationTicks,
        tick,
        occurredAt,
      };
      result.push(assignment);
      workingEvents.push(assignment);
      continue;
    }

    const alreadyQueued = workingEvents.some(
      (event) => event.kind === "specialist-queued" && event.requestId === request.requestId,
    );
    if (alreadyQueued) continue;

    const queued: PortfolioEvent = {
      kind: "specialist-queued",
      processId: request.processId,
      requestId: request.requestId,
      specialistId: request.specialistId,
      tick,
      occurredAt,
    };
    const saturated: PortfolioEvent = {
      kind: "specialist-saturated",
      processId: request.processId,
      requestId: request.requestId,
      specialistId: request.specialistId,
      tick,
      occurredAt,
    };
    result.push(queued, saturated);
    workingEvents.push(queued, saturated);
  }

  return result;
}

function completeEligibleStages({
  events,
  tick,
  occurredAt,
}: EventStep): readonly PortfolioEvent[] {
  const result: PortfolioEvent[] = [];

  for (const scenario of OPERATION_SCENARIOS) {
    const process = projectProcess(events, scenario.id);
    const stage = process.currentStage;
    if (process.status !== "in-analysis" || stage === null) continue;
    if (workflowFor(process).missing.length) continue;

    const started = findStageStart(currentExecutionEvents(process.events), stage);
    if (!started || tick - started.tick < STAGE_DURATION[stage]) continue;

    const unresolvedDependency = process.branches.some(
      (branch) => branch.originStage === stage
        && (branch.mode === "blocking" || branch.mode === "consultative")
        && branch.status !== "resolved",
    );
    if (unresolvedDependency) continue;

    if (stage === "territorial-analysis") {
      result.push(...scenario.evidence.map((evidence) => ({
        kind: "evidence-recorded" as const,
        processId: scenario.id,
        evidence,
        tick,
        occurredAt,
      })));
      if (scenario.conflict) {
        result.push({
          kind: "conflict-detected",
          processId: scenario.id,
          conflict: scenario.conflict,
          tick,
          occurredAt,
        });
      }
    }

    if (stage === "conformity") {
      result.push({
        kind: "recommendation-created",
        processId: scenario.id,
        recommendation: recommendationWithPublishedRules(scenario, events),
        tick,
        occurredAt,
      });
    }

    result.push({
      kind: "stage-completed",
      processId: scenario.id,
      stage,
      summary: scenario.stageSummaries[stage],
      tick,
      occurredAt,
    });

    const stageIndex = STAGES.indexOf(stage);
    const nextStage = STAGES[stageIndex + 1];
    if (nextStage) {
      result.push({
        kind: "stage-started",
        processId: scenario.id,
        stage: nextStage,
        tick,
        occurredAt,
      });
    } else {
      result.push({
        kind: "human-decision-requested",
        processId: scenario.id,
        tick,
        occurredAt,
      });
    }
  }

  return result;
}

function findStageStart(
  events: readonly PortfolioEvent[],
  stage: AgentStage,
) {
  return events.find(
    (event) => event.kind === "stage-started" && event.stage === stage,
  );
}

function toScenarioEvent(event: PortfolioEvent): readonly ScenarioEvent[] {
  switch (event.kind) {
    case "stage-completed":
      return [{
        kind: event.kind,
        stage: event.stage,
        occurredAt: event.occurredAt,
        summary: event.summary,
      }];
    case "evidence-recorded":
      return [{ kind: event.kind, evidence: event.evidence, occurredAt: event.occurredAt }];
    case "conflict-detected":
      return [{ kind: event.kind, conflict: event.conflict, occurredAt: event.occurredAt }];
    case "recommendation-created":
      return [{ kind: event.kind, recommendation: event.recommendation, occurredAt: event.occurredAt }];
    case "human-decision-requested":
      return [{ kind: event.kind, occurredAt: event.occurredAt }];
    case "human-decision-recorded":
      return [{ kind: event.kind, decision: event.decision, occurredAt: event.occurredAt }];
    case "dossier-issued":
      return [{ kind: event.kind, dossier: event.dossier, occurredAt: event.occurredAt }];
    case "process-received":
    case "workflow-action":
    case "stage-started":
    case "specialist-requested":
    case "specialist-assigned":
    case "specialist-queued":
    case "specialist-saturated":
    case "branch-resolved":
      return [];
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function createRecordedDecision({
  command,
  recommendation,
  decidedAt,
}: {
  readonly command: HumanDecisionCommand;
  readonly recommendation: OperationProjection["scenario"]["recommendation"];
  readonly decidedAt: string;
}): RecordedHumanDecision {
  if (command.kind === "change-route") {
    return {
      kind: command.kind,
      author: command.author,
      justification: command.justification,
      originalRoute: recommendation.route,
      selectedRoute: command.route,
      decidedAt,
    };
  }

  return {
    kind: command.kind,
    author: command.author,
    justification: command.justification,
    originalRoute: recommendation.route,
    decidedAt,
  };
}

function timeForTick(tick: number): string {
  const time = new Date(PRESENTATION_START);
  time.setUTCSeconds(time.getUTCSeconds() + tick * TICK_SECONDS);
  return time.toISOString();
}

interface EventStep {
  readonly events: readonly PortfolioEvent[];
  readonly tick: number;
  readonly occurredAt: string;
}

type SpecialistAssignedEvent = Extract<PortfolioEvent, { readonly kind: "specialist-assigned" }>;
type SpecialistQueuedEvent = Extract<PortfolioEvent, { readonly kind: "specialist-queued" }>;
type SpecialistRequestedEvent = Extract<PortfolioEvent, { readonly kind: "specialist-requested" }>;

function isSpecialistAssigned(event: PortfolioEvent): event is SpecialistAssignedEvent {
  return event.kind === "specialist-assigned";
}

function isSpecialistQueued(event: PortfolioEvent): event is SpecialistQueuedEvent {
  return event.kind === "specialist-queued";
}

function isSpecialistRequested(event: PortfolioEvent): event is SpecialistRequestedEvent {
  return event.kind === "specialist-requested";
}
