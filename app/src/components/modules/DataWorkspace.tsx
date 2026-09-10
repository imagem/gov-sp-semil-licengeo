import { useState } from "react";
import { TRIAGE_RULES } from "../../app/operation-data";
import type { ProcessExecutionProjection } from "../../domain/model";
import {
  evaluateDraft,
  publishedRule,
  recommendationWithPublishedRules,
  ruleApplies,
} from "../../domain/rule-comparison";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { LayersContent } from "./LayersContent";
import { useWorkspace } from "./workspace-context";

export function DataWorkspace({
  processes,
  initialTab = "documents",
}: {
  readonly processes: readonly ProcessExecutionProjection[];
  readonly initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab);
  return (
    <>
      <div className="workspace-tabs">
        {[
          ["documents", "Documentos"],
          ["sources", "Fontes territoriais"],
          ["rules", "Regras"],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => setTab(id ?? "documents")}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "documents" ? (
        <DocumentWorkspace processes={processes} />
      ) : tab === "sources" ? (
        <>
          <div className="source-quality">
            <div>
              <span>Atualização</span>
              <strong>Data não informada</strong>
            </div>
            <div>
              <span>Cobertura</span>
              <strong>Recortes fornecidos de SP</strong>
            </div>
            <div>
              <span>Geometria</span>
              <strong>Simplificada · não certificada</strong>
            </div>
            <div>
              <span>Disponibilidade</span>
              <strong>Arquivos locais</strong>
            </div>
          </div>
          <LayersContent query="" />
        </>
      ) : (
        <RuleWorkspace processes={processes} />
      )}
    </>
  );
}

function RuleWorkspace({
  processes,
}: {
  readonly processes: readonly ProcessExecutionProjection[];
}) {
  const api = useWorkspace();
  const [ruleId, setRuleId] = useState("app");
  const [draft, setDraft] = useState(false);
  const [weight, setWeight] = useState(30);
  const [threshold, setThreshold] = useState(35);
  const [compared, setCompared] = useState(false);
  const [reason, setReason] = useState("");
  const events = api.portfolio.processes
    .flatMap((p) => p.events)
    .sort((a, b) => a.tick - b.tick);
  const published = publishedRule(events, ruleId);
  const affected = processes.filter((p) => ruleApplies(p.scenario, ruleId));
  return (
    <div className="rules-workspace">
      <aside>
        {TRIAGE_RULES.map((rule) => (
          <button
            key={rule.id}
            aria-pressed={ruleId === rule.id}
            onClick={() => {
              setRuleId(rule.id);
              setDraft(false);
              setCompared(false);
            }}
          >
            <strong>{rule.title}</strong>
            <small>v{publishedRule(events, rule.id).version} · publicada</small>
          </button>
        ))}
      </aside>
      <section>
        <div className="register-heading">
          <h3>{TRIAGE_RULES.find((rule) => rule.id === ruleId)?.title}</h3>
          <span>Publicada v{published.version} · simulação</span>
        </div>
        <p className="muted">
          Score-base + diferença do peso em relação a 30, limitado a 0–100. O
          limiar define revisão integrada. A última regra aplicável publicada
          rege a simulação. Valores e efeitos são demonstrativos.
        </p>
        <div className="rule-settings">
          <label>
            Peso
            <input
              type="number"
              min={0}
              max={100}
              value={draft ? weight : published.weight}
              disabled={!draft}
              onChange={(e) => {
                setWeight(Number(e.target.value));
                setCompared(false);
              }}
            />
          </label>
          <label>
            Limiar de revisão
            <input
              type="number"
              min={0}
              max={100}
              value={draft ? threshold : published.threshold}
              disabled={!draft}
              onChange={(e) => {
                setThreshold(Number(e.target.value));
                setCompared(false);
              }}
            />
          </label>
        </div>
        {!draft ? (
          <button
            className="button button--secondary"
            onClick={() => {
              setDraft(true);
              setWeight(published.weight);
              setThreshold(published.threshold);
            }}
          >
            Criar rascunho
          </button>
        ) : (
          <>
            <button
              className="button button--secondary"
              onClick={() => setCompared(true)}
            >
              Comparar efeitos
            </button>
            <label>
              Justificativa
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        )}
        {compared ? (
          <>
            <h4>Comparação simulada · {affected.length} processos</h4>
            <div className="table-scroll">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Processo</th>
                    <th>Score</th>
                    <th>Rota / câmara</th>
                    <th>Prazo previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {affected.map((p) => {
                    const before = recommendationWithPublishedRules(
                      p.scenario,
                      events,
                    );
                    const after = evaluateDraft(
                      p.scenario,
                      ruleId,
                      weight,
                      threshold,
                    );
                    return (
                      <tr key={p.scenario.id}>
                        <td>
                          <button
                            className="record-title"
                            onClick={() => api.openProcess(p.scenario.id)}
                          >
                            {p.scenario.id}
                          </button>
                        </td>
                        <td>
                          {before.score} → {after.score}
                        </td>
                        <td>
                          <small>
                            {before.route} / {before.chamber}
                          </small>
                          <strong>
                            {after.route} / {after.chamber}
                          </strong>
                        </td>
                        <td>
                          {before.dueAt.slice(0, 10)} →{" "}
                          {after.dueAt.slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Risco: reduzir o limiar pode aumentar a fila de revisão; elevá-lo
              pode reduzir os encaminhamentos especializados. Decisões humanas
              anteriores são preservadas.
            </p>
            <button
              className="button button--primary"
              disabled={
                reason.trim().length < 5 ||
                !affected.length ||
                weight < 0 ||
                weight > 100 ||
                threshold < 0 ||
                threshold > 100
              }
              onClick={() => {
                const first = affected[0];
                if (first)
                  api.act(
                    first.scenario.id,
                    {
                      kind: "publish-rule",
                      ruleId,
                      weight,
                      threshold,
                      version: published.version + 1,
                    },
                    reason,
                  );
                setDraft(false);
                setCompared(false);
                setReason("");
              }}
            >
              Confirmar publicação simulada
            </button>
          </>
        ) : null}
        <details>
          <summary>Versões e justificativas</summary>
          {events
            .filter(
              (e) =>
                e.kind === "workflow-action" &&
                e.action.kind === "publish-rule" &&
                e.action.ruleId === ruleId,
            )
            .map((e, index) => (
              <p key={index}>
                {e.kind === "workflow-action" ? e.after + " · " + e.reason : ""}
              </p>
            ))}
        </details>
      </section>
    </div>
  );
}
