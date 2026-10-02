import type { OperationScenario } from "../../domain/model";

export const PROCESS_HIGH_COLOR = [220, 38, 38] as const;
export const PROCESS_LOW_COLOR = [16, 185, 129] as const;
export const EVIDENCE_ALERT_COLOR = [245, 158, 11] as const;

export interface MapAnalysisLegendItem {
  readonly label: string;
  readonly color: string;
  readonly pattern: "fill" | "dashed" | "layer";
}

export function pendingMapLegend(
  scenario: Pick<OperationScenario, "recommendation" | "focusLayer">,
  focusLayer: { readonly label: string; readonly color: string } | undefined,
  focusLayerVisible: boolean,
  evidenceVisible: boolean,
): MapAnalysisLegendItem[] {
  return [
    { label: "Processo em foco", color: colorHex(scenario.recommendation.score >= 35 ? PROCESS_HIGH_COLOR : PROCESS_LOW_COLOR), pattern: "fill" },
    ...(evidenceVisible ? [{ label: "Entorno ilustrativo da análise", color: colorHex(EVIDENCE_ALERT_COLOR), pattern: "dashed" as const }] : []),
    ...(focusLayer && focusLayerVisible ? [{ label: focusLayer.label, color: focusLayer.color, pattern: "layer" as const }] : []),
  ];
}

function colorHex(color: readonly number[]) {
  return `#${color.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
