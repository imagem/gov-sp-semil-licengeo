import type {
  OperationScenario,
  PortfolioEvent,
  Recommendation,
} from "./model";

export function publishedRule(events: readonly PortfolioEvent[], id: string) {
  const event = [...events]
    .sort(
      (a, b) =>
        (b.kind === "workflow-action" ? b.sequence : -1) -
        (a.kind === "workflow-action" ? a.sequence : -1),
    )
    .find(
      (entry) =>
        entry.kind === "workflow-action" &&
        entry.action.kind === "publish-rule" &&
        entry.action.ruleId === id,
    );
  return event?.kind === "workflow-action" &&
    event.action.kind === "publish-rule"
    ? event.action
    : { ruleId: id, weight: 30, threshold: 35, version: 1 };
}
export function evaluateDraft(
  scenario: OperationScenario,
  ruleId: string,
  weight: number,
  threshold: number,
): Recommendation {
  const base = scenario.recommendation;
  if (!ruleApplies(scenario, ruleId)) return base;
  const score = Math.max(0, Math.min(100, base.score + weight - 30));
  const escalated = score >= threshold && base.score < 35;
  const simplified = score < threshold && base.score >= 35;
  const due = new Date(base.dueAt);
  if (escalated) due.setUTCDate(due.getUTCDate() + 3);
  if (simplified) due.setUTCDate(due.getUTCDate() - 1);
  return {
    ...base,
    score,
    route: escalated
      ? "Análise integrada prioritária"
      : simplified
        ? "Triagem por checklist com revisão humana"
        : base.route,
    chamber: escalated ? "Câmara de Avaliação Integrada" : base.chamber,
    dueAt: due.toISOString(),
  };
}
export function ruleApplies(scenario: OperationScenario, id: string) {
  return (
    scenario.focusLayer === id ||
    id === "score" ||
    (id === "divergence" &&
      scenario.evidence.some((e) => e.kind === "attribute-divergence"))
  );
}
export function recommendationWithPublishedRules(
  scenario: OperationScenario,
  events: readonly PortfolioEvent[],
) {
  const latest = [...events]
    .sort(
      (a, b) =>
        (b.kind === "workflow-action" ? b.sequence : -1) -
        (a.kind === "workflow-action" ? a.sequence : -1),
    )
    .find(
      (e) =>
        e.kind === "workflow-action" &&
        e.action.kind === "publish-rule" &&
        ruleApplies(scenario, e.action.ruleId),
    );
  return latest?.kind === "workflow-action" &&
    latest.action.kind === "publish-rule"
    ? {
        ...evaluateDraft(
          scenario,
          latest.action.ruleId,
          latest.action.weight,
          latest.action.threshold,
        ),
        ruleVersion: latest.action.ruleId + " v" + latest.action.version,
      }
    : scenario.recommendation;
}
