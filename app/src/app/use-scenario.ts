import { useCallback, useEffect, useMemo, useState } from "react";

import type { HumanDecisionCommand, PortfolioState } from "../domain/model";
import {
  currentExecutionEvents,
  recordWorkflow,
  type WorkflowAction,
} from "../domain/workflow";
import {
  recommendationWithPublishedRules,
  ruleApplies,
} from "../domain/rule-comparison";
import {
  advancePortfolio,
  createPortfolio,
  issuePortfolioDossier,
  projectPortfolio,
  projectSelectedOperation,
  recordPortfolioHumanDecision,
  selectPortfolioProcess,
} from "../domain/portfolio";

export function useScenario() {
  const [state, setState] = useState<PortfolioState>(createPortfolio);
  const portfolio = useMemo(() => projectPortfolio(state), [state]);
  const projection = useMemo(() => projectSelectedOperation(state), [state]);

  const step = useCallback(() => {
    setState((current) => advancePortfolio(current));
  }, []);

  const selectProcess = useCallback((processId: string) => {
    setState((current) => selectPortfolioProcess(current, processId));
  }, []);

  const decide = useCallback((command: HumanDecisionCommand) => {
    setState((current) => recordPortfolioHumanDecision(current, command));
  }, []);

  const emitDossier = useCallback(() => {
    setState((current) => issuePortfolioDossier(current, "Ana Souza"));
  }, []);

  useEffect(() => {
    if (
      portfolio.activeProcesses.length === 0 &&
      portfolio.queuedProcesses.length === 0
    )
      return;

    const timer = window.setTimeout(step, 2400);

    return () => window.clearTimeout(timer);
  }, [
    portfolio.activeProcesses.length,
    portfolio.queuedProcesses.length,
    state,
    step,
  ]);

  const act = useCallback(
    (processId: string, action: WorkflowAction, reason: string) => {
      setState((current) => {
        const process = projectPortfolio(current).processes.find(
          (item) => item.scenario.id === processId,
        );
        if (!process) return current;
        const updated = recordWorkflow(current, process, action, reason);
        if (updated === current || action.kind !== "publish-rule")
          return updated;
        const changed = projectPortfolio(current).processes.filter(
          (p) =>
            p.recommendation &&
            !currentExecutionEvents(p.events).some(
              (e) => e.kind === "human-decision-recorded",
            ) &&
            ruleApplies(p.scenario, action.ruleId),
        );
        return {
          ...updated,
          events: [
            ...updated.events,
            ...changed.map((p) => ({
              kind: "recommendation-created" as const,
              processId: p.scenario.id,
              recommendation: recommendationWithPublishedRules(
                p.scenario,
                updated.events,
              ),
              tick: current.tick,
              occurredAt: current.clock,
            })),
          ],
        };
      });
    },
    [],
  );

  return {
    state,
    portfolio,
    projection,
    playing:
      portfolio.activeProcesses.length > 0 ||
      portfolio.queuedProcesses.length > 0,
    selectProcess,
    decide,
    emitDossier,
    act,
    decideFor: (id: string, command: HumanDecisionCommand) =>
      setState((current) =>
        recordPortfolioHumanDecision(
          selectPortfolioProcess(current, id),
          command,
        ),
      ),
    issueFor: (id: string) =>
      setState((current) =>
        issuePortfolioDossier(selectPortfolioProcess(current, id), "Ana Souza"),
      ),
  };
}
