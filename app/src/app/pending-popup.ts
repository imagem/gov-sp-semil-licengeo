import type { ProcessExecutionProjection } from "../domain/model";

export function pendingPopupDetails(process: Pick<ProcessExecutionProjection, "scenario" | "evidence">) {
  return {
    highlightLayer: process.scenario.focusLayer === "none" || !process.evidence.some((item) => item.kind === "spatial-overlap")
      ? null
      : process.scenario.focusLayerLabel,
    sources: [...new Set(process.evidence.map((item) => item.source).filter(Boolean))],
  };
}
