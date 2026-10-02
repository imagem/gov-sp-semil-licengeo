import assert from "node:assert/strict";
import test from "node:test";

import { pendingPopupDetails } from "../app/src/app/pending-popup.ts";

test("popup lists recorded evidence sources without inventing map layers", () => {
  const process = {
    scenario: { focusLayer: "ucUs", focusLayerLabel: "UC de Uso Sustentável" },
    evidence: [{ kind: "spatial-overlap", source: "UC US e polígono sintético", title: "Interseção" }],
  };
  assert.deepEqual(pendingPopupDetails(process as never).sources, ["UC US e polígono sintético"]);
  assert.equal(pendingPopupDetails(process as never).highlightLayer, "UC de Uso Sustentável");
});

test("popup distinguishes missing sources from recorded ones", () => {
  const process = { scenario: { focusLayer: "none", focusLayerLabel: "Nenhuma" }, evidence: [] };
  assert.deepEqual(pendingPopupDetails(process as never).sources, []);
  assert.equal(pendingPopupDetails(process as never).highlightLayer, null);
});
