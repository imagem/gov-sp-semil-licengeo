import { useEffect, useRef, useState } from "react";
import { X, Check } from "@phosphor-icons/react";
import { ANALYSTS, CURRENT_ANALYST, workflowFor } from "../../domain/workflow";
import { CHAMBERS, documentsFor } from "../../app/workspace-data";
import { useWorkspace } from "./workspace-context";
export type ActionRequest = {
  readonly kind: "assign" | "documents";
  readonly id: string;
  readonly documentId?: string;
};
export function WorkflowDialog({
  request,
  close,
}: {
  readonly request: ActionRequest;
  readonly close: () => void;
}) {
  const api = useWorkspace();
  const process = api.portfolio.processes.find(
    (p) => p.scenario.id === request.id,
  );
  const current = process ? workflowFor(process) : null;
  const [analyst, setAnalyst] = useState(current?.analyst || CURRENT_ANALYST);
  const [chamber, setChamber] = useState(
    current?.chamber || process?.recommendation?.chamber || "",
  );
  const [ids, setIds] = useState<string[]>(
    request.documentId ? [request.documentId] : ["DOC-4"],
  );
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  if (!process) return null;
  return (
    <dialog
      ref={ref}
      className="workspace-dialog"
      onClose={close}
      aria-labelledby="action-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          api.act(
            request.id,
            request.kind === "assign"
              ? { kind: "assign", analyst, chamber }
              : { kind: "request-documents", documentIds: ids },
            reason,
          );
          close();
        }}
      >
        <header>
          <h2 id="action-title">
            {request.kind === "assign"
              ? "Atribuir responsabilidade"
              : "Solicitar complemento"}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar"
            onClick={close}
          >
            <X />
          </button>
        </header>
        <p>
          {process.scenario.id} · {process.scenario.municipality}
        </p>
        {request.kind === "assign" ? (
          <>
            <label>
              Analista
              <select
                value={analyst}
                onChange={(e) => setAnalyst(e.target.value)}
              >
                {ANALYSTS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Câmara responsável
              <select
                value={chamber}
                disabled={!process.recommendation}
                onChange={(e) => setChamber(e.target.value)}
              >
                <option value="">Aguardando recomendação</option>
                {CHAMBERS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <p className="muted">
              Recomendação:{" "}
              {process.recommendation?.chamber ?? "ainda não produzida"}
            </p>
          </>
        ) : (
          <fieldset>
            <legend>Documentos solicitados</legend>
            {documentsFor(process).map((doc) => (
              <label className="check-field" key={doc.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(doc.id)}
                  onChange={(e) =>
                    setIds((currentIds) =>
                      e.target.checked
                        ? [...currentIds, doc.id]
                        : currentIds.filter((id) => id !== doc.id),
                    )
                  }
                />
                {doc.title}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          Justificativa
          <textarea
            value={reason}
            required
            minLength={5}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <footer>
          <span>Autoria: {CURRENT_ANALYST} · simulação</span>
          <button
            className="button button--primary"
            disabled={
              reason.trim().length < 5 ||
              (request.kind === "documents" && !ids.length)
            }
          >
            <Check /> Registrar
          </button>
        </footer>
      </form>
    </dialog>
  );
}
