import { createContext, useContext } from "react";
import type { HumanDecisionCommand, PortfolioProjection } from "../../domain/model";
import type { WorkflowAction } from "../../domain/workflow";

export interface WorkspaceApi {
  readonly portfolio: PortfolioProjection;
  readonly dark: boolean;
  readonly act: (id: string, action: WorkflowAction, reason: string) => void;
  readonly decide: (id: string, command: HumanDecisionCommand) => void;
  readonly issue: (id: string) => void;
  readonly openProcess: (id: string) => void;
  readonly openRules: () => void;
  readonly assign: (id: string) => void;
  readonly requestDocuments: (id: string, documentId?: string) => void;
}
export const WorkspaceContext = createContext<WorkspaceApi | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
