import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function loadLayerRegistry() {
  try {
    return await import("../src/lib/layer-registry.ts");
  } catch (error) {
    assert.fail(`layer registry module should load: ${error.message}`);
  }
}

test("public layer groups omit base context while keeping the boundary available", async () => {
  const { getLayerById, getLayerGroups } = await loadLayerRegistry();
  const groups = getLayerGroups();

  assert.deepEqual(
    groups.map((group) => group.id),
    ["analysis", "ptal", "services", "vulnerability", "earth-observation"],
  );

  const boundary = getLayerById("context-boundary-citta-metropolitana-milano");
  assert.ok(boundary, "boundary layer should still be registered for map context");
  assert.equal(boundary.group, "context");
  assert.equal(boundary.defaultVisible, true);
});

test("analytical sections expose the requested strict summary and component layers", async () => {
  const { getLayerById, getLayerGroups } = await loadLayerRegistry();
  const groups = new Map(getLayerGroups().map((group) => [group.id, group]));

  const expectations = {
    vulnerability: [
      ["vulnerability-elderly", "h3_svi_elderly.geojson", "Elderly"],
      ["vulnerability-employment", "h3_svi_labour.geojson", "Labour"],
      ["vulnerability-education", "h3_svi_education.geojson", "Education"],
      ["vulnerability-citizenship", "h3_svi_citizenship.geojson", "Citizenship"],
      ["vulnerability-income", "h3_svi_income.geojson", "Income"],
      ["vulnerability-motorisation", "h3_svi_motorisation.geojson", "Motorisation"],
      ["vulnerability-low-car-access", "h3_svi_low_car_access.geojson", "LowCarAccess"],
      ["vulnerability-car-dependency-stress", "h3_car_dependency_stress.geojson", "CarDependencyStress"],
      ["vulnerability-index", "h3_social_vulnerability_index.geojson", "SVI"],
    ],
    ptal: [
      ["ptal-public-transport-accessibility", "h3_public_transport_accessibility.geojson", "PTA"],
      ["ptal-public-transport-deficit", "h3_public_transport_deficit.geojson", "PTD"],
      ["ptal-service-frequency", "h3_pt_service_frequency.geojson", "FR"],
      ["ptal-line-availability", "h3_pt_line_availability.geojson", "LA"],
      ["ptal-ptal-100m-gtfs-netex", "ptal_4_8_h3_100m_gtfs_netex_web.geojson", "ptal"],
      ["ptal-ptol-100m-gtfs-netex", "ptol_4_8_h3_100m_gtfs_netex_web.geojson", "ptol"],
      ["ptal-stops-all", "stops_all_gtfs_netex.geojson", undefined],
    ],
    services: [
      ["services-essential-services-accessibility", "h3_essential_services_accessibility.geojson", "ESA"],
      ["services-essential-service-deficit", "h3_essential_services_deficit.geojson", "ESD"],
      ["services-health-access", "h3_health_access.geojson", "HealthAccess"],
      ["services-school-access", "h3_school_access.geojson", "SchoolAccess"],
      ["services-job-access", "h3_job_access.geojson", "JobAccess"],
      ["services-grocery-access", "h3_grocery_access.geojson", "GroceryAccess"],
      ["services-points-all", "milan_essential_services_points.geojson", undefined],
    ],
    "earth-observation": [
      ["earth-observation-territorial-disadvantage", "h3_eo_territorial_disadvantage.geojson", "EOTD"],
      ["earth-observation-population-demand", "h3_population_demand.geojson", "P"],
      ["earth-observation-built-up-density", "h3_built_up_density.geojson", "B"],
      ["earth-observation-artificial-land-cover", "h3_artificial_land_cover.geojson", "A"],
      ["earth-observation-artificial-land-cover-100m", "eo_artificial_land_cover_100m.geojson", "landcover_artificial_share"],
      ["earth-observation-nighttime-lights", "h3_night_time_lights.geojson", "L"],
      ["earth-observation-nighttime-lights-100m", "eo_night_lights_sdgsat1_100m_fast.geojson", "ntl_sdgsat1_lh_score"],
      ["earth-observation-road-density", "h3_road_density.geojson", "RoadDensity"],
      ["earth-observation-intersection-density", "h3_intersection_density.geojson", "IntersectionDensity"],
      ["earth-observation-road-connectivity", "h3_road_connectivity.geojson", "R"],
      ["earth-observation-green-land", "h3_green_open_land.geojson", "G"],
      ["earth-observation-urban-growth", "h3_urban_growth.geojson", "U"],
    ],
  };

  for (const [groupId, expectedLayers] of Object.entries(expectations)) {
    const group = groups.get(groupId);
    assert.ok(group, `missing group ${groupId}`);
    assert.deepEqual(
      group.layers.map((layer) => [layer.id, layer.fileName, layer.thematicProperty]),
      expectedLayers,
    );
  }

  assert.equal(
    groups.get("vulnerability").layers.find((layer) => layer.id === "vulnerability-index").defaultVisible,
    true,
  );
  assert.equal(
    groups.get("ptal").layers.find((layer) => layer.id === "ptal-public-transport-deficit").defaultVisible,
    true,
  );
  assert.equal(
    groups.get("ptal").layers.find((layer) => layer.id === "ptal-ptal-100m-gtfs-netex").name,
    "ptal",
  );
  assert.equal(
    groups.get("ptal").layers.find((layer) => layer.id === "ptal-ptol-100m-gtfs-netex").name,
    "ptol",
  );
  assert.ok(
    !groups.get("ptal").layers.some((layer) =>
      [
        "ptal-ptal-component",
        "ptal-ptal-detailed",
        "ptal-ptol-component",
        "ptal-ptol-detailed",
        "ptal-ptal-ptol-component",
      ].includes(layer.id),
    ),
    "screenshot-only PTAL/PTOL component and detailed layers should be hidden from layer groups",
  );
  assert.ok(
    [
      "ptal-ptal-component",
      "ptal-ptal-detailed",
      "ptal-ptol-component",
      "ptal-ptol-detailed",
      "ptal-ptal-ptol-component",
    ].every((id) => getLayerById(id)),
    "hidden PTAL/PTOL layers should remain registered for direct access",
  );
  assert.equal(
    groups.get("services").layers.find((layer) => layer.id === "services-essential-service-deficit").defaultVisible,
    true,
  );
  assert.equal(
    groups.get("earth-observation").layers.find((layer) => layer.id === "earth-observation-territorial-disadvantage").defaultVisible,
    true,
  );
});

test("vulnerability layers use distinct palettes and keep no-population cells available as no data", async () => {
  const { getLayerGroups } = await loadLayerRegistry();
  const vulnerability = getLayerGroups().find((group) => group.id === "vulnerability");

  assert.ok(vulnerability, "missing vulnerability group");
  assert.equal(
    new Set(vulnerability.layers.map((layer) => layer.palette)).size,
    vulnerability.layers.length,
  );

  const source = JSON.parse(
    await readFile(
      new URL("../data/geojson/vulnerability/h3_svi_elderly.geojson", import.meta.url),
      "utf8",
    ),
  );
  const noPopulationCells = source.features.filter(
    (feature) => Number(feature.properties?.total_ghsl_population_count) <= 0,
  );

  assert.ok(noPopulationCells.length > 1000, "expected explicit no-population H3 cells");
});

test("essential service points use lon-lat coordinates visible to MapLibre", async () => {
  const source = JSON.parse(
    await readFile(
      new URL("../data/geojson/services/milan_essential_services_points.geojson", import.meta.url),
      "utf8",
    ),
  );

  assert.ok(source.features.length > 1000, "service point layer should contain points");

  for (const feature of source.features.slice(0, 100)) {
    const [lon, lat] = feature.geometry?.coordinates ?? [];

    assert.ok(lon >= 8 && lon <= 10, `expected longitude near Milan, got ${lon}`);
    assert.ok(lat >= 45 && lat <= 46, `expected latitude near Milan, got ${lat}`);
  }
});

test("analysis section points to strict final-score layers", async () => {
  const { getLayerGroups } = await loadLayerRegistry();
  const analysis = getLayerGroups().find((group) => group.id === "analysis");

  assert.ok(analysis, "missing analysis group");
  assert.deepEqual(
    analysis.layers.map((layer) => [layer.id, layer.fileName, layer.thematicProperty ?? layer.thematicClassProperty]),
    [
      ["analysis-intervention-priority", "h3_intervention_priority_index.geojson", "intervention_priority_score"],
      ["analysis-hotspot-score", "h3_transport_poverty_hotspot_score.geojson", "TPHS"],
      ["analysis-data-confidence", "h3_data_confidence_score.geojson", "DCS"],
      ["analysis-typology", "h3_hotspot_typology.geojson", "typology"],
    ],
  );
});

test("dashboard priority layer stores formula score and full-map normalized score", async () => {
  const source = JSON.parse(
    await readFile(
      new URL("../data/geojson/analysis/h3_intervention_priority_index.geojson", import.meta.url),
      "utf8",
    ),
  );
  const scores = source.features
    .map((feature) => feature.properties?.intervention_priority_score)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  const formulaScores = source.features
    .map((feature) => feature.properties?.intervention_priority_formula_score)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  const sampleProperties = source.features[0]?.properties ?? {};

  assert.ok(scores.length > 1000, "normalized priority score should exist on all H3 features");
  assert.equal(formulaScores.length, scores.length);
  assert.equal(Math.min(...scores), 0);
  assert.equal(Math.max(...scores), 100);
  assert.notEqual(sampleProperties.intervention_priority_score, sampleProperties.intervention_priority_formula_score);
  assert.ok("pt_deficit_score" in sampleProperties);
  assert.ok("essential_services_deficit_score" in sampleProperties);
  assert.ok("city2graph_network_penalty_score" in sampleProperties);
  assert.ok("score_breakdown_json" in sampleProperties);
});

test("analysis report cards keep normalized priority scores inside 0-100", async () => {
  const cards = JSON.parse(
    await readFile(
      new URL("../data/analysis/tables/ai_hotspot_cards.json", import.meta.url),
      "utf8",
    ),
  );

  assert.ok(cards.length > 1000, "report cards should cover selectable H3 cells");

  for (const card of cards.slice(0, 50)) {
    assert.ok(card.intervention_priority_score >= 0);
    assert.ok(card.intervention_priority_score <= 100);
    assert.ok(card.scores.intervention_priority_score >= 0);
    assert.ok(card.scores.intervention_priority_score <= 100);
  }
});

test("source no longer keeps compatibility branches for removed old layer ids", async () => {
  const sourceFiles = [
    "../src/lib/layer-registry.ts",
    "../src/components/app-sidebar.tsx",
    "../src/components/milan-layer-viewer.tsx",
  ];
  const combinedSource = (
    await Promise.all(
      sourceFiles.map((file) => readFile(new URL(file, import.meta.url), "utf8")),
    )
  ).join("\n");

  const removedLayerIds = [
    "ptal-public-transport-accessibility-level",
    "ptal-public-transport-opportunity-level",
    "ptal-old-ptd",
    "services-essential-service-points",
    "services-essential-service-gap",
    "vulnerability-age",
    "vulnerability-gender",
    "earth-observation-sdgsat1-night-lights",
    "earth-observation-green-open-land-cover",
    "earth-observation-urban-growth-2010-2020",
    "analysis-transit-dependency",
    "analysis-hotspot-clusters",
    "analysis-critical-transit-stops",
  ];

  for (const layerId of removedLayerIds) {
    assert.doesNotMatch(combinedSource, new RegExp(layerId));
  }
});

test("old GeoJSON layer assets are removed from the active data tree", async () => {
  const removedFiles = [
    "../data/geojson/analysis/tp_ipt_analysis_h3_res9_fast.geojson",
    "../data/geojson/analysis/tp_ipt_analysis_h3_res9.geojson",
    "../data/geojson/analysis/h3_combined_priority_all_fields.geojson",
    "../data/geojson/analysis/gtfs_netex_transit_dependency_h3_res9_fast.geojson",
    "../data/geojson/analysis/gtfs_netex_transit_dependency_h3_res9.geojson",
    "../data/geojson/analysis/tp_ipt_hotspot_clusters.geojson",
    "../data/geojson/analysis/critical_transit_stop_nodes.geojson",
    "../data/geojson/vulnerability/milan_metropolitan_vulnerability_h3_res9_2023.geojson",
    "../data/geojson/vulnerability/boundary_citta_metropolitana_milano.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_age_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_age_100m_web.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_employment_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_employment_100m_web.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_gender_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_gender_100m_web.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_education_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_education_100m_web.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_citizenship_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_citizenship_100m_web.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_index_100m_fast.geojson",
    "../data/geojson/vulnerability/milan_vulnerability_index_100m_web.geojson",
    "../data/geojson/ptal/ptal_4_8_h3_100m_gtfs_netex_fast.geojson",
    "../data/geojson/ptal/ptol_4_8_h3_100m_gtfs_netex_fast.geojson",
    "../data/geojson/ptal/old_ptd.geojson",
    "../data/geojson/services/service_points_all.geojson",
    "../data/geojson/services/essential_services_accessibility_h3_res9.geojson",
    "../data/geojson/services/essential_services_accessibility_h3_res9_fast.geojson",
    "../data/geojson/earth-observation/eo_night_lights_sdgsat1_100m.geojson",
    "../data/geojson/earth-observation/eo_artificial_land_cover_100m_fast.geojson",
    "../data/geojson/earth-observation/eo_green_open_land_cover_100m_fast.geojson",
    "../data/geojson/earth-observation/eo_green_open_land_cover_100m.geojson",
    "../data/geojson/earth-observation/eo_built_up_density_100m_fast.geojson",
    "../data/geojson/earth-observation/eo_built_up_density_100m.geojson",
    "../data/geojson/earth-observation/eo_urban_growth_2010_2020_100m_fast.geojson",
    "../data/geojson/earth-observation/eo_urban_growth_2010_2020_100m.geojson",
  ];

  for (const file of removedFiles) {
    for (const suffix of ["", ".gz", ".br"]) {
      await assert.rejects(access(new URL(`${file}${suffix}`, import.meta.url)));
    }
  }
});
