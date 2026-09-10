import type { OperationProjection, PortfolioProjection } from "../../domain/model";

interface KpiStripProps {
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
}

interface KpiDefinition {
  readonly label: string;
  readonly value: string;
  readonly tone: "primary" | "info" | "critical" | "warning" | "success";
}

export function KpiStrip({ projection, portfolio }: KpiStripProps) {
  const queued = portfolio.queuedProcesses.length;
  const riskCount = portfolio.processes
    .filter((process) => process.recommendation !== null)
    .filter((process) => (process.recommendation?.score ?? 0) >= 55)
    .length;
  const scoreTone = projection.score === null
    ? "info"
    : projection.score >= 55
      ? "critical"
      : projection.score >= 35
        ? "warning"
        : "success";

  const items = [
    { label: "Na fila", value: String(queued), tone: "primary" },
    { label: "Em análise", value: String(portfolio.activeProcesses.length), tone: "info" },
    { label: "Risco de SLA", value: String(riskCount), tone: "critical" },
    { label: "Prazo mediano", value: "2d 6h", tone: "warning" },
    { label: "Score atual", value: projection.score === null ? "--" : String(projection.score), tone: scoreTone },
    { label: "Processados", value: String(portfolio.completedProcesses.length), tone: "success" },
  ] satisfies readonly KpiDefinition[];

  return (
    <section className="kpi-strip" aria-label="Indicadores operacionais" aria-live="polite">
      <dl>
        {items.map((item) => (
          <div className={`kpi-item kpi-item--${item.tone}`} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
