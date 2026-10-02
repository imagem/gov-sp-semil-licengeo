import assert from "node:assert/strict";
import test from "node:test";

import { pendingMarkerSpecs } from "../app/src/components/map/pending-markers.ts";

test("one marker is shown for each pending process and removed after deliberation", () => {
  const first = { scenario: { id: "PROC-2026-0514", center: [-47.18, -23.69] as const, municipality: "Ibiúna, SP" } };
  const second = { scenario: { id: "PROC-2026-0515", center: [-46.8, -23.2] as const, municipality: "São Paulo, SP" } };
  assert.deepEqual(pendingMarkerSpecs([first, second]).map((item) => item.id), ["PROC-2026-0514", "PROC-2026-0515"]);
  assert.deepEqual(pendingMarkerSpecs([second]).map((item) => item.id), ["PROC-2026-0515"]);
  assert.deepEqual(pendingMarkerSpecs([first, second]).map((item) => item.id), ["PROC-2026-0514", "PROC-2026-0515"]);
});
