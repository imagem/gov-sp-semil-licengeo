import {
  ArrowRight,
  CheckCircle,
  FloppyDisk,
  MapTrifold,
  SlidersHorizontal,
  Stack,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type {
  RuleConfiguration,
  RuleOperator,
  RuleSeverity,
  TriageRule,
} from "../../app/operation-data";

interface RuleDetailsDialogProps {
  readonly open: boolean;
  readonly rule: TriageRule;
  readonly configuration: RuleConfiguration;
  readonly onClose: () => void;
  readonly onLocate: () => void;
  readonly onSave: (configuration: RuleConfiguration) => void;
}

export function RuleDetailsDialog({
  open,
  rule,
  configuration,
  onClose,
  onLocate,
  onSave,
}: RuleDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const definition = ruleDefinition(rule.id);
  const [operator, setOperator] = useState<RuleOperator>(configuration.operator);
  const [threshold, setThreshold] = useState(configuration.threshold);
  const [severity, setSeverity] = useState<RuleSeverity>(configuration.severity);
  const [action, setAction] = useState(configuration.action);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setOperator(configuration.operator);
    setThreshold(configuration.threshold);
    setSeverity(configuration.severity);
    setAction(configuration.action);
  }, [configuration, open, rule.id]);

  function saveConfiguration() {
    onSave({ operator, threshold: threshold.trim(), severity, action: action.trim() });
  }

  return (
    <dialog className="rule-dialog" ref={dialogRef} onClose={onClose}>
      <article>
        <header>
          <div>
            <span>Regra publicada · {rule.version}</span>
            <h2>{rule.title}</h2>
            <p>Ajuste a condição, o limiar e a ação aplicada durante a triagem demonstrativa.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <section className="rule-diagram" aria-label="Fluxo visual da regra">
          <RuleNode icon={<Stack />} label="Camadas" value={rule.layers} />
          <ArrowRight aria-hidden="true" />
          <RuleNode icon={<SlidersHorizontal />} label="Condição" value={`${operatorLabel(operator)} · ${threshold}`} />
          <ArrowRight aria-hidden="true" />
          <RuleNode icon={<CheckCircle />} label="Ação" value={action} />
        </section>

        <section className="rule-config-form" aria-label="Configuração da regra">
          <label>
            <span>Operador espacial</span>
            <select value={operator} onChange={(event) => {
              if (isRuleOperator(event.target.value)) setOperator(event.target.value);
            }}>
              <option value="intersects">Interseção espacial</option>
              <option value="greater-than">Maior que</option>
              <option value="greater-than-or-equal">Maior ou igual a</option>
            </select>
          </label>
          <label>
            <span>Limiar</span>
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} />
          </label>
          <label>
            <span>Severidade</span>
            <select value={severity} onChange={(event) => {
              if (isRuleSeverity(event.target.value)) setSeverity(event.target.value);
            }}>
              <option value="attention">Atenção</option>
              <option value="critical">Crítica</option>
            </select>
          </label>
          <label className="rule-config-form__action">
            <span>Ação automática</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} />
          </label>
          <div className="rule-config-result">
            <span>Resultado no processo atual</span>
            <strong>{rule.result}</strong>
          </div>
        </section>

        <section className="rule-layer-list">
          <h3>Camadas e proveniência</h3>
          {definition.layers.map((layer) => (
            <div key={layer.name}>
              <MapTrifold aria-hidden="true" />
              <span><strong>{layer.name}</strong><small>{layer.source}</small></span>
              <span className={`provenance-chip provenance-chip--${layer.provenance}`}>{layer.label}</span>
            </div>
          ))}
        </section>

        <footer>
          <span>As alterações valem durante esta sessão demonstrativa.</span>
          <div className="rule-dialog__actions">
            <button className="button button--secondary" type="button" onClick={onLocate}>
              <MapTrifold aria-hidden="true" /> Localizar no mapa
            </button>
            <button className="button button--primary" type="button" onClick={saveConfiguration} disabled={!threshold.trim() || !action.trim()}>
              <FloppyDisk aria-hidden="true" /> Salvar configuração
            </button>
          </div>
        </footer>
      </article>
    </dialog>
  );
}

function RuleNode({ icon, label, value }: { readonly icon: ReactNode; readonly label: string; readonly value: string }) {
  return (
    <div className="rule-node">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function operatorLabel(operator: RuleOperator) {
  switch (operator) {
    case "intersects": return "Interseção espacial";
    case "greater-than": return "Maior que";
    case "greater-than-or-equal": return "Maior ou igual a";
    default: { const exhaustive: never = operator; return exhaustive; }
  }
}

function isRuleOperator(value: string): value is RuleOperator {
  return value === "intersects" || value === "greater-than" || value === "greater-than-or-equal";
}

function isRuleSeverity(value: string): value is RuleSeverity {
  return value === "attention" || value === "critical";
}

function ruleDefinition(id: TriageRule["id"]) {
  switch (id) {
    case "app":
      return {
        layers: [
          { name: "Hidrografia ANA", source: "Referência de drenagem", provenance: "provided", label: "Dado fornecido" },
          { name: "APP 30 m", source: "Buffer calculado na simulação", provenance: "synthetic", label: "Dado sintético" },
        ],
      };
    case "divergence":
      return {
        layers: [
          { name: "Área declarada", source: "CAR 2.0", provenance: "provided", label: "Dado fornecido" },
          { name: "Interpretação de imagem", source: "Imagem de 28 ago", provenance: "provided", label: "Dado fornecido" },
        ],
      };
    case "ucPi":
      return {
        layers: [{ name: "UC estadual, Proteção Integral", source: "Camada fornecida simplificada", provenance: "provided", label: "Dado fornecido" }],
      };
    case "ucUs":
      return {
        layers: [{ name: "UC estadual, Uso Sustentável", source: "Camada fornecida simplificada", provenance: "provided", label: "Dado fornecido" }],
      };
    case "terrasIndigenas":
      return {
        layers: [{ name: "Terras Indígenas", source: "Camada fornecida simplificada", provenance: "provided", label: "Dado fornecido" }],
      };
    case "score":
      return {
        layers: [
          { name: "Evidências consolidadas", source: "Agentes 2, 3 e 4", provenance: "result", label: "Resultado simulado" },
        ],
      };
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
