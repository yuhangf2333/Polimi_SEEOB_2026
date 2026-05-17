import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
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

test("retrieveCity2graphRelationships keeps internal engine names out of public context text", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  const result = await retrieveCity2graphRelationships({
    dataRoot: fixtureDataRoot,
    context: {
      scope: {
        h3_id: "891f99564c7ffff",
      },
    },
    limit: 2,
  });

  assert.ok(result);
  assert.doesNotMatch(result.contextText, /city2graph/i);
  assert.match(result.contextText, /Transit dependency relationships/);
  assert.match(result.contextText, /route and stop dependency evidence/i);
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

test("retrieveCity2graphRelationships accepts dashboard and camelCase H3 context keys", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  const result = await retrieveCity2graphRelationships({
    dataRoot: fixtureDataRoot,
    context: {
      h3_id: "891f0000000ffff",
      scope: {
        h3Id: "891f99564c7ffff",
      },
    },
    limit: 1,
  });

  assert.ok(result);
  assert.equal(result.h3Id, "891f99564c7ffff");
  assert.equal(result.summary?.primaryRouteLine, "27");
});

test("retrieveCity2graphRelationships can read projected coordinates from top-level dashboard context", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();

  const result = await retrieveCity2graphRelationships({
    dataRoot: fixtureDataRoot,
    context: {
      h3_id: "891f99564c7ffff",
      selected_coordinate_projected: {
        x: 500035,
        y: 5030020,
        crs: "EPSG:32632",
      },
    },
    limit: 1,
  });

  assert.ok(result?.nearestAccess);
  assert.equal(result.nearestAccess.gridId, "101");
});

test("retrieveCity2graphRelationships resolves city2graph data from standalone server cwd", async () => {
  const { retrieveCity2graphRelationships } = await loadCity2graphRelationships();
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "city2graph-standalone-"));
  const transitRoot = path.join(
    tempRoot,
    "city2graphy_milano",
    "gtfs_netex_transit_dependency_graph",
    "outputs",
    "data",
  );
  const walkingRoot = path.join(
    tempRoot,
    "city2graphy_milano",
    "outputs",
    "walking_network_bc_full",
  );
  const standaloneCwd = path.join(tempRoot, "app", ".next", "standalone");
  const originalCwd = process.cwd();

  try {
    await fs.mkdir(transitRoot, { recursive: true });
    await fs.mkdir(walkingRoot, { recursive: true });
    await fs.mkdir(standaloneCwd, { recursive: true });
    await Promise.all(
      [
        "h3_res9_transit_dependency.csv",
        "h3_to_route_dependency_edges.csv",
        "h3_to_stop_dependency_edges.csv",
      ].map((fileName) =>
        fs.copyFile(path.join(fixtureDataRoot, fileName), path.join(transitRoot, fileName)),
      ),
    );
    await fs.copyFile(
      path.join(fixtureDataRoot, "milan_bc_walking_network_access.csv"),
      path.join(walkingRoot, "milan_bc_walking_network_access.csv"),
    );

    process.chdir(standaloneCwd);
    const result = await retrieveCity2graphRelationships({
      context: {
        scope: {
          h3Id: "891f99564c7ffff",
        },
        selected_coordinate_projected: {
          x: 500035,
          y: 5030020,
          crs: "EPSG:32632",
        },
      },
      limit: 1,
    });

    assert.ok(result);
    assert.equal(result.h3Id, "891f99564c7ffff");
    assert.equal(result.summary?.primaryRouteLine, "27");
    assert.equal(result.nearestAccess?.gridId, "101");
    assert.ok(
      result.sources.some((source) => source.id === "city2graph-nearest-walking-access"),
    );
  } finally {
    process.chdir(originalCwd);
    await fs.rm(tempRoot, { force: true, recursive: true });
  }
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
