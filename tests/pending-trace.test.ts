import assert from "node:assert/strict";
import test from "node:test";

import { pendingExplanation, eventAttribution, processTraceSteps } from "../app/src/app/pending-trace.ts";

const rules = [{ id: "ucUs", code: "R-03", title: "Interseção com UC de Uso Sustentável" }, { id: "humanReview", code: "R-HUM", title: "Revisão humana ao fim da triagem" }];
const specialists = [{ id: "ESP-07", name: "UC de Uso Sustentável e amortecimento" }, { id: "ESP-11", name: "Biodiversidade, fauna e conectividade" }];
const scenario = { id: "PROC-2026-0514", focusLayer: "ucUs", recommendation: { route: "Revisão técnica orientada" } };
const evidence = { title: "UC de Uso Sustentável", measure: "0,36 ha", detail: "Interferência na APA Itupararanga" };

test("pending explanation only names specialists requested in the diary", () => {
  const process = { scenario, evidence: [evidence], events: [
    { kind: "specialist-requested", specialistId: "ESP-07", trigger: "Interseção de 0,36 ha com APA Itupararanga", title: "Análise da APA" },
    { kind: "human-decision-requested" },
  ] };
  const result = pendingExplanation(process as never, rules as never, specialists as never);
  assert.equal(result.ruleCode, "R-03");
  assert.match(result.evidence, /0,36 ha/);
  assert.deepEqual(result.specialists.map((item) => item.id), ["ESP-07"]);
});

test("missing links are marked as unrecorded", () => {
  const result = pendingExplanation({ scenario: { ...scenario, focusLayer: "none" }, evidence: [], events: [{ kind: "human-decision-requested" }] } as never, rules as never, specialists as never);
  assert.equal(result.evidence, "Aguardando registro");
  assert.equal(result.ruleCode, "R-HUM");
});

test("human event attribution preserves the recorded author", () => {
  assert.equal(eventAttribution({ kind: "human-decision-recorded", decision: { author: "Ana Souza" } } as never, specialists as never), "Ana Souza · analista humano");
});

test("the visual chain does not publish a decision before it is recorded", () => {
  const process = { scenario, evidence: [evidence], events: [{ kind: "evidence-recorded", evidence }, { kind: "human-decision-requested" }] };
  const steps = processTraceSteps(process as never, rules as never, specialists as never);
  assert.equal(steps.at(-1)?.label, "Decisão humana");
  assert.equal(steps.at(-1)?.value, "Ainda não registrado");
  assert.match(steps[1]?.value ?? "", /0,36 ha/);
});

test("a restarted triage does not show specialists from the previous cycle", () => {
  const process = { scenario, evidence: [], events: [
    { kind: "specialist-requested", specialistId: "ESP-07", requestId: "BR-OLD", trigger: "Interseção anterior", title: "Análise anterior" },
    { kind: "workflow-action", action: { kind: "receive-documents" } },
    { kind: "stage-started", stage: "receiving" },
  ] };
  assert.deepEqual(pendingExplanation(process as never, rules as never, specialists as never).specialists, []);
});

test("non-spatial evidence does not claim a territorial intersection", () => {
  const process = { scenario: { ...scenario, focusLayer: "none" }, evidence: [{ kind: "attribute-divergence", title: "CAR", measure: "2 registros", detail: "Titulares diferentes" }], events: [{ kind: "human-decision-requested" }] };
  const result = pendingExplanation(process as never, rules as never, specialists as never);
  assert.match(result.reason, /fonte e a documentação/);
  assert.doesNotMatch(result.reason, /interseção/);
});
