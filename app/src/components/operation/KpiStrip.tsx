import type { OperationProjection, PortfolioProjection } from "../../domain/model";

interface KpiStripProps {
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
}

interface KpiDefinition {
  readonly label: string;
  readonly value: string;
  readonly description: string;
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
    { label: "Na fila", value: String(queued), description: "Processos recebidos que aguardam o início da triagem digital.", tone: "primary" },
    { label: "Em análise", value: String(portfolio.activeProcesses.length), description: "Processos com triagem digital em andamento neste momento.", tone: "info" },
    { label: "Risco de SLA", value: String(riskCount), description: "Processos avaliados com score de risco igual ou superior a 55.", tone: "critical" },
    { label: "Prazo mediano", value: "2d 6h", description: "Prazo mediano simulado para conclusão dos processos.", tone: "warning" },
    { label: "Score atual", value: projection.score === null ? "--" : String(projection.score), description: "Score de risco do processo focado, disponível após a avaliação.", tone: scoreTone },
    { label: "Processados", value: String(portfolio.completedProcesses.length), description: "Processos cuja triagem digital foi concluída.", tone: "success" },
  ] satisfies readonly KpiDefinition[];

  return (
    <section className="kpi-strip" aria-label="Indicadores operacionais" aria-live="polite">
      <dl>
        {items.map((item) => (
          <div className={`kpi-item kpi-item--${item.tone}`} key={item.label} tabIndex={0} aria-describedby={`kpi-${item.label.replaceAll(" ", "-")}`}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            <span className="kpi-item__tooltip" role="tooltip" id={`kpi-${item.label.replaceAll(" ", "-")}`}>{item.description}</span>
          </div>
        ))}
      </dl>
    </section>
  );
}
