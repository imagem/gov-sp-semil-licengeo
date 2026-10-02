import { ArrowRight } from "@phosphor-icons/react";

import type { PortfolioEvent, ProcessExecutionProjection } from "../../domain/model";
import { processTraceSteps } from "../../app/pending-trace";
import { EXPLANATION_RULES } from "../../app/operation-data";
import { SPECIALISTS } from "../../app/specialists";

export function ProcessTrace({ process, onOpenHistory }: { readonly process: ProcessExecutionProjection; readonly onOpenHistory: (kind?: PortfolioEvent["kind"]) => void }) {
  const steps = processTraceSteps(process, EXPLANATION_RULES, SPECIALISTS);
  return <section className="process-trace" aria-label="Cadeia de rastreabilidade do processo">
    <header><h4>Do polígono à decisão</h4><p>Cada vínculo usa registros disponíveis no diário desta simulação.</p></header>
    <ol>{steps.map((step, index) => <li key={step.label}>
      <span className="process-trace__number">{index + 1}</span>
      <button type="button" disabled={step.value === "Ainda não registrado"} onClick={() => onOpenHistory(step.eventKind)}><strong>{step.label}</strong><p>{step.value}</p></button>
      {index < steps.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
    </li>)}</ol>
    <button className="text-action" type="button" onClick={() => onOpenHistory()}>Ver registros no Histórico <ArrowRight /></button>
  </section>;
}
