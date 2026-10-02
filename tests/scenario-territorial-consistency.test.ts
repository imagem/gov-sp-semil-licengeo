import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ALL_OPERATION_SCENARIOS } from "../app/src/app/operation-scenarios.ts";

type Position = readonly [number, number];
type Feature = {
  properties: { nome?: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

const files = {
  app: "app-hidrica-simulada",
  ucPi: "uc-protecao-integral",
  ucUs: "uc-uso-sustentavel",
  terrasIndigenas: "terras-indigenas",
} as const;

const layers = Object.fromEntries(Object.entries(files).map(([id, file]) => [
  id,
  (JSON.parse(readFileSync(new URL(`../app/public/assets/layers/demo-simplified/${file}.geojson`, import.meta.url), "utf8")) as { features: Feature[] }).features,
])) as Record<keyof typeof files, Feature[]>;

function contains(point: Position, ring: readonly Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function segmentsMeet(a: Position, b: Position, c: Position, d: Position): boolean {
  const turn = (p: Position, q: Position, r: Position) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0]) ||
      Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) return false;
  return turn(a, b, c) * turn(a, b, d) <= 0 && turn(c, d, a) * turn(c, d, b) <= 0;
}

function ringsMeet(a: readonly Position[], b: readonly Position[]): boolean {
  if (Math.max(...a.map((point) => point[0])) < Math.min(...b.map((point) => point[0])) ||
      Math.max(...b.map((point) => point[0])) < Math.min(...a.map((point) => point[0])) ||
      Math.max(...a.map((point) => point[1])) < Math.min(...b.map((point) => point[1])) ||
      Math.max(...b.map((point) => point[1])) < Math.min(...a.map((point) => point[1]))) return false;
  return a.some((point) => contains(point, b)) || b.some((point) => contains(point, a)) ||
    a.some((point, i) => b.some((other, j) => segmentsMeet(point, a[(i + 1) % a.length]!, other, b[(j + 1) % b.length]!)));
}

function intersectsFeature(ring: readonly Position[], feature: Feature): boolean {
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as number[][][]]
    : feature.geometry.coordinates as number[][][][];
  return polygons.some((polygon) => ringsMeet(ring, polygon[0] as Position[]));
}

test("every simulated process names a layer that actually intersects its polygon", () => {
  assert.equal(ALL_OPERATION_SCENARIOS.length, 15);
  for (const scenario of ALL_OPERATION_SCENARIOS) {
    const hits = Object.entries(layers).flatMap(([id, features]) =>
      features.filter((feature) => intersectsFeature(scenario.polygon, feature)).map((feature) => ({ id, name: feature.properties.nome ?? "" })),
    );
    const focused = hits.filter((hit) => hit.id === scenario.focusLayer);
    assert.equal(focused.length > 0, scenario.focusLayer !== "none", `${scenario.id}: camada em foco e polígono divergem`);
    if (scenario.focusLayer === "none") assert.equal(hits.length, 0, `${scenario.id}: interseção omitida do cenário`);
    if (scenario.focusLayer !== "none") assert.ok(scenario.evidence.some((item) => item.kind === "spatial-overlap"), `${scenario.id}: falta evidência espacial`);
  }
});

test("the UC and TI cases point to the named features", () => {
  const expected = {
    "PROC-2026-0513": "Assis",
    "PROC-2026-0514": "Itupararanga",
    "PROC-2026-0515": "Pindoty",
    "PROC-2026-0523": "Cabre",
    "PROC-2026-0525": "Cuesta Guarani",
  } as const;
  for (const [id, name] of Object.entries(expected)) {
    const scenario = ALL_OPERATION_SCENARIOS.find((item) => item.id === id)!;
    const features = layers[scenario.focusLayer as keyof typeof layers];
    assert.ok(features.some((feature) => feature.properties.nome?.includes(name) && intersectsFeature(scenario.polygon, feature)), `${id}: ${name}`);
  }
});
