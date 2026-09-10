import {
  ArrowRight,
  CirclesThreePlus,
  GearSix,
  Stack,
  Warning,
} from "@phosphor-icons/react";

import {
  TRIAGE_RULES,
  type RuleConfiguration,
  type TriageRule,
} from "../../app/operation-data";
import { PanelFrame } from "../shell/PanelFrame";

interface RulesPanelProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly selectedRule: TriageRule["id"];
  readonly enabledRules: Readonly<Record<TriageRule["id"], boolean>>;
  readonly configurations: Readonly<Record<TriageRule["id"], RuleConfiguration>>;
  readonly onSelectRule: (rule: TriageRule) => void;
  readonly onToggleRule: (rule: TriageRule) => void;
  readonly onConfigureRule: (rule: TriageRule) => void;
}

export function RulesPanel({
  collapsed,
  onToggle,
  selectedRule,
  enabledRules,
  configurations,
  onSelectRule,
  onToggleRule,
  onConfigureRule,
}: RulesPanelProps) {
  const activeRuleCount = TRIAGE_RULES.filter((rule) => enabledRules[rule.id]).length;

  return (
    <PanelFrame
      className="rules-panel"
      title="Regras em execução"
      subtitle={`${activeRuleCount} ativas nesta simulação`}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="rule-list">
        {TRIAGE_RULES.map((rule) => {
          const enabled = enabledRules[rule.id];
          const configuration = configurations[rule.id];

          return (
            <div
              className={[
                "rule-row",
                rule.id === selectedRule ? "rule-row--selected" : "",
                enabled ? "" : "rule-row--disabled",
              ].filter(Boolean).join(" ")}
              key={rule.id}
            >
              <button className="rule-row__main" type="button" onClick={() => onSelectRule(rule)}>
                <span className={`rule-row__icon rule-row__icon--${rule.tone}`}>
                  {rule.id === "app" ? <Stack /> : rule.id === "score" ? <CirclesThreePlus /> : <Warning />}
                </span>
                <span className="rule-row__content">
                  <span className="rule-row__title">
                    <strong>{rule.title}</strong>
                    <small>{rule.version}</small>
                  </span>
                  <small>{rule.layers}</small>
                  <span>{configuration.threshold} · <strong>{rule.result}</strong></span>
                </span>
              </button>
              <div className="rule-row__actions">
                <button
                  className="rule-switch"
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? "Desativar" : "Ativar"} regra ${rule.title}`}
                  onClick={() => onToggleRule(rule)}
                >
                  <span aria-hidden="true" />
                </button>
                <button
                  className="rule-settings"
                  type="button"
                  aria-label={`Configurar regra ${rule.title}`}
                  onClick={() => onConfigureRule(rule)}
                >
                  <GearSix aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="text-action text-action--wide"
        type="button"
        onClick={() => {
          const selected = TRIAGE_RULES.find((rule) => rule.id === selectedRule);
          if (selected) onConfigureRule(selected);
        }}
      >
        Configurar regra selecionada <ArrowRight aria-hidden="true" />
      </button>
    </PanelFrame>
  );
}
