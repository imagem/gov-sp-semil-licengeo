import type { AgentStage, ProvenanceKind } from "../domain/model";

export interface QueueItem {
  readonly id: string;
  readonly municipality: string;
  readonly summary: string;
  readonly sla: string;
  readonly severity: "critical" | "warning" | "normal";
}

export interface TriageRule {
  readonly id: "app" | "ucPi" | "ucUs" | "terrasIndigenas" | "divergence" | "score";
  readonly code: string;
  readonly title: string;
  readonly layers: string;
  readonly result: string;
  readonly version: "v2026.08";
  readonly tone: "selected" | "warning" | "critical";
}

export type RuleOperator = "intersects" | "greater-than" | "greater-than-or-equal";
export type RuleSeverity = "attention" | "critical";

export interface RuleConfiguration {
  readonly operator: RuleOperator;
  readonly threshold: string;
  readonly severity: RuleSeverity;
  readonly action: string;
}

export interface AgentDefinition {
  readonly stage: AgentStage;
  readonly number: number;
  readonly shortName: string;
  readonly purpose: string;
  readonly inputs: readonly string[];
  readonly tools: readonly string[];
  readonly outputs: readonly string[];
}

export const QUEUE_ITEMS: readonly QueueItem[] = [
  {
    id: "PROC-2026-0512",
    municipality: "Bebedouro, SP",
    summary: "Divergência imagem x declaração em APP",
    sla: "+3 dias",
    severity: "critical",
  },
  {
    id: "PROC-2026-0487",
    municipality: "Itatinga, SP",
    summary: "Supressão em APP acima do limite",
    sla: "+2 dias",
    severity: "warning",
  },
  {
    id: "PROC-2026-0471",
    municipality: "Avaré, SP",
    summary: "Cobertura vegetal inconsistente",
    sla: "+1 dia",
    severity: "warning",
  },
  {
    id: "PROC-2026-0456",
    municipality: "Botucatu, SP",
    summary: "Cadastro incompleto",
    sla: "2 dias",
    severity: "normal",
  },
];

export const DEFAULT_TRIAGE_RULE: TriageRule = {
  id: "app",
  code: "R-01",
  title: "APP hídrica > 0 ha",
  layers: "Hidrografia + APP 30 m",
    result: "Sobreposição cartográfica simulada",
  version: "v2026.08",
  tone: "selected",
};

export const TRIAGE_RULES: readonly TriageRule[] = [
  DEFAULT_TRIAGE_RULE,
  {
    id: "ucPi",
    code: "R-02",
    title: "Interseção com UC de Proteção Integral",
    layers: "UC estadual, Proteção Integral",
    result: "Restrição e análise aprofundada",
    version: "v2026.08",
    tone: "critical",
  },
  {
    id: "ucUs",
    code: "R-03",
    title: "Interseção com UC de Uso Sustentável",
    layers: "UC estadual, Uso Sustentável",
    result: "Alerta e revisão técnica",
    version: "v2026.08",
    tone: "warning",
  },
  {
    id: "terrasIndigenas",
    code: "R-04",
    title: "Interseção com Terra Indígena",
    layers: "Terras Indígenas",
    result: "Restrição e análise especializada",
    version: "v2026.08",
    tone: "critical",
  },
  {
    id: "divergence",
    code: "R-05",
    title: "Divergência imagem > 20%",
    layers: "Declaração + imagem 28 ago",
    result: "Divergência 36%",
    version: "v2026.08",
    tone: "warning",
  },
  {
    id: "score",
    code: "R-06",
    title: "Score de complexidade >= 35",
    layers: "Evidências consolidadas",
    result: "Análise aprofundada",
    version: "v2026.08",
    tone: "critical",
  },
];

export const EXPLANATION_RULES: readonly (Pick<TriageRule, "id" | "code" | "title"> | { readonly id: "humanReview"; readonly code: string; readonly title: string })[] = [
  ...TRIAGE_RULES,
  { id: "humanReview", code: "R-HUM", title: "Revisão humana ao fim da triagem" },
];

export const DEFAULT_RULE_CONFIGURATIONS = {
  app: {
    operator: "intersects",
    threshold: "0 ha",
    severity: "critical",
    action: "Gerar evidência e elevar prioridade",
  },
  ucPi: {
    operator: "intersects",
    threshold: "0 ha",
    severity: "critical",
    action: "Encaminhar para análise aprofundada",
  },
  ucUs: {
    operator: "intersects",
    threshold: "0 ha",
    severity: "attention",
    action: "Solicitar revisão técnica",
  },
  terrasIndigenas: {
    operator: "intersects",
    threshold: "0 ha",
    severity: "critical",
    action: "Encaminhar para análise especializada",
  },
  divergence: {
    operator: "greater-than",
    threshold: "20%",
    severity: "attention",
    action: "Solicitar análise territorial",
  },
  score: {
    operator: "greater-than-or-equal",
    threshold: "35 pontos",
    severity: "critical",
    action: "Encaminhar para análise aprofundada",
  },
} satisfies Readonly<Record<TriageRule["id"], RuleConfiguration>>;

export const AGENTS: readonly AgentDefinition[] = [
  {
    stage: "receiving",
    number: 1,
    shortName: "Recebimento e documentos",
    purpose: "Confere o protocolo, identifica lacunas e transforma os documentos recebidos em um inventário rastreável.",
    inputs: ["Protocolo", "CAR", "Documentos"],
    tools: ["Leitura documental"],
    outputs: ["Inventário", "Completude"],
  },
  {
    stage: "geometry",
    number: 2,
    shortName: "Qualidade e geometria",
    purpose: "Valida projeção, fechamento, área e consistência topológica antes de qualquer cruzamento territorial.",
    inputs: ["Polígono declarado"],
    tools: ["Validação geométrica"],
    outputs: ["Geometria válida"],
  },
  {
    stage: "territorial-analysis",
    number: 3,
    shortName: "Análise territorial",
    purpose: "Cruza o empreendimento com restrições ambientais, imagens e camadas oficiais para produzir evidências mensuráveis.",
    inputs: ["Imagem", "Hidrografia"],
    tools: ["Buffer", "Interseção"],
    outputs: ["Evidências", "Métricas"],
  },
  {
    stage: "conformity",
    number: 4,
    shortName: "Conformidade e complexidade",
    purpose: "Aplica as regras vigentes, combina as evidências e explica os fatores que formam o score de complexidade.",
    inputs: ["Evidências"],
    tools: ["Regras v2026.08"],
    outputs: ["Score", "Recomendação"],
  },
  {
    stage: "routing",
    number: 5,
    shortName: "Encaminhamento e capacidade",
    purpose: "Seleciona a câmara responsável e estima prazo com base em assunto, risco e capacidade simulada da fila.",
    inputs: ["Score", "Filas"],
    tools: ["Capacidade simulada"],
    outputs: ["Câmara", "Prazo"],
  },
  {
    stage: "opinion",
    number: 6,
    shortName: "Parecer e assistência",
    purpose: "Consolida achados, proveniência e recomendações em uma minuta pronta para revisão humana.",
    inputs: ["Dossiê"],
    tools: ["Síntese rastreável"],
    outputs: ["Minuta", "Checklist"],
  },
];

export const PROVENANCE_LABELS: Record<ProvenanceKind, string> = {
  "provided-data": "Dado fornecido",
  "synthetic-data": "Dado sintético",
  "simulated-result": "Resultado simulado",
};
