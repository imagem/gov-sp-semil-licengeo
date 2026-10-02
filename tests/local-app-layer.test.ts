import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the bundled APP layer is a valid simulated GeoJSON polygon", () => {
  const url = new URL("../app/public/assets/layers/demo-simplified/app-hidrica-simulada.geojson", import.meta.url);
  const collection = JSON.parse(readFileSync(url, "utf8"));

  assert.equal(collection.type, "FeatureCollection");
  assert.equal(collection.features.length, 1);
  const feature = collection.features[0];
  assert.equal(feature.geometry.type, "Polygon");
  assert.equal(feature.properties.natureza, "geometria sintética para demonstração");
  const ring = feature.geometry.coordinates[0];
  assert.deepEqual(ring[0], ring.at(-1));
  assert.ok(ring.every(([longitude, latitude]: number[]) => longitude >= -54 && longitude <= -44 && latitude >= -26 && latitude <= -19));
});
