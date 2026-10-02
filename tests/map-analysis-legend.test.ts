import assert from "node:assert/strict";
import test from "node:test";

import { pendingMapLegend } from "../app/src/components/map/map-analysis-legend.ts";

test("the pending legend matches the three visible analysis shapes for process 0512", () => {
  assert.deepEqual(pendingMapLegend({ recommendation: { score: 62 }, focusLayer: "app" } as never, { label: "APP hídrica", color: "#2f80ed" }, true), [
    { label: "Área analisada", color: "#dc2626", pattern: "fill" },
    { label: "Evidência da análise", color: "#f59e0b", pattern: "dashed" },
    { label: "APP hídrica", color: "#2f80ed", pattern: "layer" },
  ]);
});

test("hidden or unrelated catalog layers are absent from the pending legend", () => {
  assert.equal(pendingMapLegend({ recommendation: { score: 62 }, focusLayer: "app" } as never, { label: "APP hídrica", color: "#2f80ed" }, false).length, 2);
  assert.equal(pendingMapLegend({ recommendation: { score: 10 }, focusLayer: "none" } as never, undefined, false)[1]?.color, "#10b981");
});
