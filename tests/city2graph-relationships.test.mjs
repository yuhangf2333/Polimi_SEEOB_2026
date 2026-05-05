import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDataRoot = path.join(__dirname, "fixtures", "city2graph");

async function loadCity2graphRelationships() {
  try {
    return await import("../src/lib/city2graph-relationships.ts");
  } catch (error) {
    assert.fail(`city2graph relationships module should load: ${error.message}`);
  }
}

test("retrieveCity2graphRelationships reads summary and top route/stop edges for selected H3", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  const result = await retrieveCity2graphRelationships({
    dataRoot: fixtureDataRoot,
    context: {
      scope: {
        h3_id: "891f99564c7ffff",
        municipality: "Milano",
      },
    },
    limit: 2,
  });

  assert.ok(result);
  assert.equal(result.h3Id, "891f99564c7ffff");
  assert.equal(result.summary?.transitDependencyDiagnosis, "Multimodal supported");
  assert.equal(result.summary?.primaryRouteLine, "27");
  assert.equal(result.summary?.primaryStopId, "rail:trenord_regione_lombardia:S01492");
  assert.equal(result.topRoutes.length, 2);
  assert.deepEqual(
    result.topRoutes.map((route) => route.line),
    ["27", "4"],
  );
  assert.equal(result.topStops[0].sapId, "rail:trenord_regione_lombardia:S01492");
  assert.match(result.contextText, /\| Route rank \| Line \| Mode \| Operator \| Share \| Wait \| Frequency \|/);
  assert.match(result.contextText, /Multimodal supported/);
});

test("retrieveCity2graphRelationships adds nearest walking-access evidence from selected coordinate", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  const result = await retrieveCity2graphRelationships({
    dataRoot: fixtureDataRoot,
    context: {
      scope: {
        h3_id: "891f99564c7ffff",
        selected_coordinate_projected: {
          x: 500035,
          y: 5030020,
          crs: "EPSG:32632",
        },
      },
    },
    limit: 2,
  });

  assert.ok(result?.nearestAccess);
  assert.equal(result.nearestAccess.gridId, "101");
  assert.equal(result.nearestAccess.municipality, "Milano");
  assert.equal(result.nearestAccess.nearestPharmacyM, 220);
  assert.equal(result.nearestAccess.nearestOsmGroceryM, 180);
  assert.equal(result.nearestAccess.serviceWalkDistanceM, 310);
  assert.equal(result.nearestAccess.ptalWalkDistanceM, 420);
  assert.equal(result.nearestAccess.mismatchClass, "both_near");
  assert.match(result.contextText, /Nearest walking-access grid evidence/);
  assert.match(result.contextText, /\| Nearest pharmacy \| 220 m \|/);
});

test("retrieveCity2graphRelationships returns null when H3 is unavailable or not found", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  assert.equal(
    await retrieveCity2graphRelationships({
      dataRoot: fixtureDataRoot,
      context: { scope: { area: "citywide" } },
    }),
    null,
  );
  assert.equal(
    await retrieveCity2graphRelationships({
      dataRoot: fixtureDataRoot,
      h3Id: "891f0000000ffff",
    }),
    null,
  );
});
