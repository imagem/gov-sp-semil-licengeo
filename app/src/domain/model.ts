import type { WorkflowAction } from "./workflow";

export type AgentStage =
  | "receiving"
  | "geometry"
  | "territorial-analysis"
  | "conformity"
  | "routing"
  | "opinion";

export type SpecialistId =
  | "ESP-01"
  | "ESP-02"
  | "ESP-03"
  | "ESP-04"
  | "ESP-05"
  | "ESP-06"
  | "ESP-07"
  | "ESP-08"
  | "ESP-09"
  | "ESP-10"
  | "ESP-11"
  | "ESP-12"
  | "ESP-13"
  | "ESP-14"
  | "ESP-15"
  | "ESP-16"
  | "ESP-17"
  | "ESP-18"
  | "ESP-19"
  | "ESP-20";

export type SpecialistDepartment =
  | "entry-quality"
  | "territorial-intelligence"
  | "regulation-coordination"
  | "decision-operation";

export type BranchMode =
  | "blocking"
  | "consultative"
  | "parallel"
  | "operational";

export type ProcessStatus =
  | "in-analysis"
  | "human-decision-required"
  | "awaiting-complement"
  | "opinion-ready"
  | "opinion-issued";

export type ProvenanceKind =
  | "provided-data"
  | "synthetic-data"
  | "simulated-result";

export type EnvironmentalLayerId =
  | "app"
  | "ucPi"
  | "ucUs"
  | "terrasIndigenas"
  | "none";

export type HumanDecisionCommand =
  | {
      readonly kind: "approve-recommendation";
      readonly author: string;
      readonly justification: string;
    }
  | {
      readonly kind: "request-complement";
      readonly author: string;
      readonly justification: string;
    }
  | {
      readonly kind: "change-route";
      readonly author: string;
      readonly justification: string;
      readonly route: string;
    };

export interface SpatialEvidence {
  readonly kind: "spatial-overlap";
  readonly id: string;
  readonly title: string;
  readonly measure: string;
  readonly detail: string;
  readonly source: string;
  readonly observedAt: string;
  readonly provenance: ProvenanceKind;
}

export interface DivergenceEvidence {
  readonly kind: "attribute-divergence";
  readonly id: string;
  readonly title: string;
  readonly measure: string;
  readonly detail: string;
  readonly source: string;
  readonly observedAt: string;
  readonly provenance: ProvenanceKind;
}

export type Evidence = SpatialEvidence | DivergenceEvidence;

export interface Conflict {
  readonly title: string;
  readonly summary: string;
  readonly detail: string;
}

export interface Recommendation {
  readonly ruleVersion?: string;
  readonly score: number;
  readonly route: string;
  readonly chamber: string;
  readonly dueAt: string;
  readonly provenance: "simulated-result";
}

export interface RecordedHumanDecision {
  readonly kind: HumanDecisionCommand["kind"];
  readonly author: string;
  readonly justification: string;
  readonly originalRoute: Recommendation["route"];
  readonly decidedAt: string;
  readonly selectedRoute?: string;
}

export interface Dossier {
  readonly identifier: string;
  readonly issuedAt: string;
  readonly issuedBy: string;
  readonly evidenceCount: number;
  readonly ruleVersion: string;
}

export interface OperationScenario {
  readonly id: string;
  readonly title: string;
  readonly processType: string;
  readonly applicant: string;
  readonly municipality: string;
  readonly sector: string;
  readonly center: readonly [number, number];
  readonly polygon: readonly (readonly [number, number])[];
  readonly mapZoom: number;
  readonly focusLayer: EnvironmentalLayerId;
  readonly focusLayerLabel: string;
  readonly evidence: readonly Evidence[];
  readonly conflict: Conflict | null;
  readonly recommendation: Recommendation;
  readonly stageSummaries: Readonly<Record<AgentStage, string>>;
  readonly arrivalTick: number;
  readonly branches: readonly BranchRequestTemplate[];
}

export interface BranchRequestTemplate {
  readonly id: string;
  readonly specialistId: SpecialistId;
  readonly originStage: AgentStage;
  readonly mode: BranchMode;
  readonly durationTicks: number;
  readonly title: string;
  readonly trigger: string;
  readonly result: string;
}

export interface SpecialistDefinition {
  readonly id: SpecialistId;
  readonly department: SpecialistDepartment;
  readonly name: string;
  readonly capacity: number;
  readonly triggers: readonly string[];
}

export type ScenarioEvent =
  | {
      readonly kind: "stage-completed";
      readonly stage: AgentStage;
      readonly occurredAt: string;
      readonly summary: string;
    }
  | {
      readonly kind: "evidence-recorded";
      readonly evidence: Evidence;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "conflict-detected";
      readonly conflict: Conflict;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "recommendation-created";
      readonly recommendation: Recommendation;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "human-decision-requested";
      readonly occurredAt: string;
    }
  | {
      readonly kind: "human-decision-recorded";
      readonly decision: RecordedHumanDecision;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "dossier-issued";
      readonly dossier: Dossier;
      readonly occurredAt: string;
    };

export interface ScenarioState {
  readonly clock: string;
  readonly events: readonly ScenarioEvent[];
  readonly otherProcessesAdvanced: number;
  readonly activeScenarioIndex: number;
  readonly completedScenarioIds: readonly string[];
}

export interface OperationProjection {
  readonly scenario: OperationScenario;
  readonly scenarioIndex: number;
  readonly scenarioTotal: number;
  readonly completedScenarioIds: readonly string[];
  readonly currentStage: AgentStage;
  readonly completedStages: readonly AgentStage[];
  readonly status: ProcessStatus;
  readonly evidence: readonly Evidence[];
  readonly conflict: Conflict | null;
  readonly score: number | null;
  readonly recommendation: Recommendation | null;
  readonly humanDecision: RecordedHumanDecision | null;
  readonly dossier: Dossier | null;
  readonly otherProcessesAdvanced: number;
  readonly clock: string;
  readonly events: readonly ScenarioEvent[];
}

export type PortfolioEvent =
  | { readonly kind: "workflow-action"; readonly sequence: number; readonly action: WorkflowAction; readonly processId: string; readonly author: string; readonly reason: string; readonly before: string; readonly after: string; readonly tick: number; readonly occurredAt: string }
  | {
      readonly kind: "process-received";
      readonly processId: string;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "stage-started";
      readonly processId: string;
      readonly stage: AgentStage;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "stage-completed";
      readonly processId: string;
      readonly stage: AgentStage;
      readonly tick: number;
      readonly occurredAt: string;
      readonly summary: string;
    }
  | {
      readonly kind: "specialist-requested";
      readonly processId: string;
      readonly requestId: string;
      readonly specialistId: SpecialistId;
      readonly originStage: AgentStage;
      readonly mode: BranchMode;
      readonly durationTicks: number;
      readonly title: string;
      readonly trigger: string;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "specialist-assigned";
      readonly processId: string;
      readonly requestId: string;
      readonly specialistId: SpecialistId;
      readonly completesAtTick: number;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "specialist-queued";
      readonly processId: string;
      readonly requestId: string;
      readonly specialistId: SpecialistId;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "specialist-saturated";
      readonly processId: string;
      readonly requestId: string;
      readonly specialistId: SpecialistId;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "branch-resolved";
      readonly processId: string;
      readonly requestId: string;
      readonly specialistId: SpecialistId;
      readonly result: string;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "evidence-recorded";
      readonly processId: string;
      readonly evidence: Evidence;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "conflict-detected";
      readonly processId: string;
      readonly conflict: Conflict;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "recommendation-created";
      readonly processId: string;
      readonly recommendation: Recommendation;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "human-decision-requested";
      readonly processId: string;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "human-decision-recorded";
      readonly processId: string;
      readonly decision: RecordedHumanDecision;
      readonly tick: number;
      readonly occurredAt: string;
    }
  | {
      readonly kind: "dossier-issued";
      readonly processId: string;
      readonly dossier: Dossier;
      readonly tick: number;
      readonly occurredAt: string;
    };

export interface PortfolioState {
  readonly tick: number;
  readonly clock: string;
  readonly selectedProcessId: string | null;
  readonly pinnedProcessId: string | null;
  readonly events: readonly PortfolioEvent[];
}

export interface BranchProjection {
  readonly id: string;
  readonly specialistId: SpecialistId;
  readonly originStage: AgentStage;
  readonly mode: BranchMode;
  readonly title: string;
  readonly result: string | null;
  readonly status: "waiting" | "queued" | "active" | "resolved";
}

export interface ProcessExecutionProjection {
  readonly scenario: OperationScenario;
  readonly status: "queued" | "in-analysis" | "triage-completed";
  readonly currentStage: AgentStage | null;
  readonly completedStages: readonly AgentStage[];
  readonly branches: readonly BranchProjection[];
  readonly evidence: readonly Evidence[];
  readonly conflict: Conflict | null;
  readonly recommendation: Recommendation | null;
  readonly events: readonly PortfolioEvent[];
}

export interface SpecialistLoadProjection {
  readonly specialist: SpecialistDefinition;
  readonly activeAssignments: readonly {
    readonly processId: string;
    readonly requestId: string;
    readonly completesAtTick: number;
  }[];
  readonly queuedAssignments: readonly {
    readonly processId: string;
    readonly requestId: string;
  }[];
  readonly status: "available" | "active" | "shared" | "saturated";
}

export interface PortfolioProjection {
  readonly tick: number;
  readonly clock: string;
  readonly selectedProcessId: string | null;
  readonly pinnedProcessId: string | null;
  readonly processes: readonly ProcessExecutionProjection[];
  readonly queuedProcesses: readonly ProcessExecutionProjection[];
  readonly activeProcesses: readonly ProcessExecutionProjection[];
  readonly completedProcesses: readonly ProcessExecutionProjection[];
  readonly specialists: readonly SpecialistLoadProjection[];
}
