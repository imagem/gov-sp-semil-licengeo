import { CheckCircle, DownloadSimple, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import type { OperationProjection } from "../../domain/model";
import type { ProcessExecutionProjection } from "../../domain/model";
import { pendingExplanation } from "../../app/pending-trace";
import { EXPLANATION_RULES } from "../../app/operation-data";
import { SPECIALISTS } from "../../app/specialists";

interface DossierDialogProps {
  readonly open: boolean;
  readonly projection: OperationProjection;
  readonly process: ProcessExecutionProjection | undefined;
  readonly onClose: () => void;
  readonly onIssue: () => void;
}

export function DossierDialog({ open, projection, process, onClose, onIssue }: DossierDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const explanation = process ? pendingExplanation(process, EXPLANATION_RULES, SPECIALISTS) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className="dossier-dialog" ref={dialogRef} onClose={onClose}>
      <article>
        <header>
          <div>
            <span>{projection.dossier?.identifier ?? "Minuta para emissão"}</span>
            <h2>Dossiê de triagem</h2>
            <p>{projection.scenario.id} · {projection.scenario.applicant}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>

        <div className="dossier-status">
          <CheckCircle aria-hidden="true" />
          <div>
            <strong>{projection.dossier ? "Parecer demonstrativo emitido" : "Pronto para emissão"}</strong>
            <span>A recomendação original e a decisão humana permanecem rastreáveis.</span>
          </div>
        </div>

        <section className="dossier-grid">
          <div><span>Geometria</span><strong>{projection.scenario.municipality} · processo simulado</strong></div>
          <div><span>Evidências</span><strong>{projection.evidence.length} verificações críticas</strong></div>
          <div><span>Complexidade</span><strong>{projection.scenario.recommendation.score}/100 · {complexityLabel(projection.scenario.recommendation.score)}</strong></div>
          <div><span>Regra</span><strong>v2026.08</strong></div>
          <div><span>Rota recomendada</span><strong>{projection.scenario.recommendation.route}</strong></div>
          <div><span>Decisão humana</span><strong>{projection.humanDecision ? "Aprovada por Ana Souza" : "Aguardando"}</strong></div>
        </section>

        <section className="dossier-copy">
          <h3>Minuta técnica</h3>
          <p>
            A triagem territorial simulada registrou {projection.scenario.evidence.map((evidence) => `${evidence.title.toLowerCase()} de ${evidence.measure}`).join(" e ")} para o processo {projection.scenario.id}.
          </p>
          <p>
            Recomenda-se {projection.scenario.recommendation.route.toLowerCase()} pela {projection.scenario.recommendation.chamber}. A decisão final permanece sob responsabilidade da equipe técnica.
          </p>
        </section>

        {explanation ? <section className="dossier-copy">
          <h3>Trilha da recomendação</h3>
          <p><strong>Fase produtora:</strong> {explanation.producer}</p>
          <p><strong>Regra demonstrativa:</strong> {explanation.ruleCode} · {explanation.ruleTitle}</p>
          <p><strong>Evidência:</strong> {explanation.evidence}</p>
          {explanation.specialists.map((item) => <p key={item.id}><strong>{item.id} · {item.name}:</strong> convocado por {item.trigger}. Resultado: {item.result}.</p>)}
          <p><strong>Decisão humana:</strong> {projection.humanDecision ? `${projection.humanDecision.author}: ${projection.humanDecision.justification}` : "Aguardando registro"}</p>
        </section> : null}

        <footer>
          <span>Ambiente demonstrativo · dados simulados</span>
          {projection.dossier ? (
            <button className="button button--secondary" type="button"><DownloadSimple /> Exportar cópia</button>
          ) : (
            <button className="button button--primary" type="button" onClick={onIssue}><CheckCircle /> Emitir parecer</button>
          )}
        </footer>
      </article>
    </dialog>
  );
}

function complexityLabel(score: number) {
  if (score >= 55) return "Alta";
  if (score >= 35) return "Média";
  return "Baixa";
}
