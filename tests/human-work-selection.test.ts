import assert from "node:assert/strict";
import test from "node:test";

import { resolveHumanWorkProcessId } from "../app/src/components/operation/human-work-selection.ts";

test("keeps the clicked pending process selected when global focus changes", () => {
  assert.equal(
    resolveHumanWorkProcessId("pending", "PROC-2026-0512", "PROC-2026-0513"),
    "PROC-2026-0512",
  );
});

test("other human-work tabs continue to follow global focus", () => {
  assert.equal(
    resolveHumanWorkProcessId("decisions", "PROC-2026-0512", "PROC-2026-0513"),
    "PROC-2026-0513",
  );
});
