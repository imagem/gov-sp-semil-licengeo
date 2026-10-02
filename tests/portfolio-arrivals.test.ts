import assert from "node:assert/strict";
import test from "node:test";

import { advancePortfolio, createPortfolio, projectPortfolio } from "../app/src/domain/portfolio.ts";

test("documents enter the visible portfolio over time, up to twelve", () => {
  let state = createPortfolio();
  assert.equal(projectPortfolio(state).processes.length, 1);

  state = advancePortfolio(state);
  assert.equal(projectPortfolio(state).processes.length, 1);

  state = advancePortfolio(state);
  assert.equal(projectPortfolio(state).processes.length, 1);

  state = advancePortfolio(state);
  assert.equal(projectPortfolio(state).processes.length, 2);

  for (let tick = state.tick; tick < 29; tick += 1) state = advancePortfolio(state);
  assert.equal(projectPortfolio(state).processes.length, 12);
});
