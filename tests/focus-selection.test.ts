import assert from "node:assert/strict";
import test from "node:test";

import { resolvePortfolioSelection } from "../app/src/domain/focus-selection.ts";

test("a fixed pending process survives another arrival and completed triage", () => {
  assert.equal(resolvePortfolioSelection("PROC-2026-0514", "PROC-2026-0514", ["PROC-2026-0515"], "PROC-2026-0515", ["PROC-2026-0514", "PROC-2026-0515"]), "PROC-2026-0514");
});

test("unfixed focus follows an active process", () => {
  assert.equal(resolvePortfolioSelection(null, "PROC-2026-0514", ["PROC-2026-0515"], null, ["PROC-2026-0514", "PROC-2026-0515"]), "PROC-2026-0515");
});

test("an unavailable fixed process falls back to an available process", () => {
  assert.equal(resolvePortfolioSelection("PROC-REMOVED", "PROC-REMOVED", ["PROC-2026-0515"], null, ["PROC-2026-0515"]), "PROC-2026-0515");
});
