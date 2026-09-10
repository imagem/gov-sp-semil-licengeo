import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { HumanDecisionCommand, OperationProjection } from "../../domain/model";

type DecisionKind = HumanDecisionCommand["kind"];

interface DecisionDialogProps {
  readonly open: boolean;
  readonly initialKind: DecisionKind;
  readonly projection: OperationProjection;
  readonly onClose: () => void;
  readonly onDecision: (command: HumanDecisionCommand) => void;
}

export function DecisionDialog({ open, initialKind, projection, onClose, onDecision }: DecisionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<DecisionKind>("approve-recommendation");
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) setKind(initialKind);
  }, [initialKind, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = justification.trim();
    if (trimmed.length < 8) {
      setError("Registre uma justificativa com pelo menos 8 caracteres.");
      return;
    }

    onDecision(createCommand(kind, trimmed));
    setJustification("");
    setError("");
    onClose();
  }

  return (
    <dialog className="decision-dialog" ref={dialogRef} onClose={onClose}>
      <form method="dialog" onSubmit={submit}>
        <header>
          <div>
            <span>{projection.scenario.id}</span>
            <h2>Resolver pendência</h2>
            <p>Compare a recomendação com as evidências antes de registrar a decisão.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <section className="decision-evidence">
          <div>
            <span>Recomendação original</span>
            <strong>{projection.scenario.recommendation.route}</strong>
          </div>
          <div>
            <span>Score simulado</span>
            <strong>{projection.scenario.recommendation.score}/100</strong>
          </div>
          <div>
            <span>Resultado territorial</span>
            <strong>{projection.scenario.conflict?.summary ?? projection.scenario.evidence[0]?.detail ?? "Sem conflito territorial"}</strong>
          </div>
        </section>

        <fieldset>
          <legend>Decisão</legend>
          <label className={kind === "approve-recommendation" ? "decision-option decision-option--selected" : "decision-option"}>
            <input type="radio" name="decision" checked={kind === "approve-recommendation"} onChange={() => setKind("approve-recommendation")} />
            <span><strong>Aprovar encaminhamento</strong><small>Preserva a rota recomendada e prepara o parecer.</small></span>
          </label>
          <label className={kind === "request-complement" ? "decision-option decision-option--selected" : "decision-option"}>
            <input type="radio" name="decision" checked={kind === "request-complement"} onChange={() => setKind("request-complement")} />
            <span><strong>Solicitar complemento</strong><small>Registra a falta de informação e devolve o processo.</small></span>
          </label>
          <label className={kind === "change-route" ? "decision-option decision-option--selected" : "decision-option"}>
            <input type="radio" name="decision" checked={kind === "change-route"} onChange={() => setKind("change-route")} />
            <span><strong>Alterar rota</strong><small>Encaminha para análise integrada e preserva a recomendação original.</small></span>
          </label>
        </fieldset>

        <label className="field-label" htmlFor="decision-justification">
          Justificativa
          <textarea
            id="decision-justification"
            value={justification}
            onChange={(event) => setJustification(event.currentTarget.value)}
            aria-describedby={error ? "decision-error" : undefined}
            aria-invalid={Boolean(error)}
            placeholder="Registre os critérios conferidos e o motivo da decisão."
            rows={4}
          />
        </label>
        {error ? <p className="field-error" id="decision-error" role="alert">{error}</p> : null}

        <footer>
          <button className="button button--secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="button button--primary" type="submit">
            <CheckCircle aria-hidden="true" /> Registrar decisão
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function createCommand(kind: DecisionKind, justification: string): HumanDecisionCommand {
  if (kind === "change-route") {
    return {
      kind,
      author: "Ana Souza",
      justification,
      route: "Análise técnica integrada",
    };
  }

  return {
    kind,
    author: "Ana Souza",
    justification,
  };
}
