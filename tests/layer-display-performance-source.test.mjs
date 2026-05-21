import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadLayerRegistry() {
  try {
    return await import("../src/lib/layer-registry.ts");
  } catch (error) {
    assert.fail(`layer registry module should load: ${error.message}`);
  }
}

test("map rendering requests the display-optimized layer representation", async () => {
  const source = await readFile(
    new URL("../src/components/milan-layer-viewer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /mode=display/,
    "GeoJsonLayer should request compact display assets instead of full analytical GeoJSON",
  );
});

test("large layers expose compact display assets while preserving original files", async () => {
  const { getLayerById } = await loadLayerRegistry();
  const priority = getLayerById("analysis-intervention-priority");

  assert.ok(priority, "priority layer should be registered");
  assert.match(
    priority.displayFileName ?? "",
    /h3_intervention_priority_index\.display\.geojson$/,
  );
  assert.ok(
    priority.displaySizeBytes > 0,
    "priority layer should expose display asset size for cache busting",
  );
  assert.equal(
    priority.fileName,
    "h3_intervention_priority_index.geojson",
    "full source file should remain available for the API fallback",
  );
});

test("100m source surfaces stay visible and use display assets", async () => {
  const { getLayerById, getLayerGroups } = await loadLayerRegistry();
  const largeLayerIds = [
    "ptal-ptal-100m-gtfs-netex",
    "ptal-ptol-100m-gtfs-netex",
    "earth-observation-artificial-land-cover-100m",
    "earth-observation-nighttime-lights-100m",
  ];
  const menuLayerIds = new Set(
    getLayerGroups().flatMap((group) => group.layers.map((layer) => layer.id)),
  );

  for (const layerId of largeLayerIds) {
    const layer = getLayerById(layerId);

    assert.ok(layer, `${layerId} should remain registered`);
    assert.ok(menuLayerIds.has(layerId), `${layerId} should remain visible in menu`);
    assert.ok(
      layer.displayFileName && layer.displaySizeBytes > 0,
      `${layerId} should have a compact display representation`,
    );
  }
});
