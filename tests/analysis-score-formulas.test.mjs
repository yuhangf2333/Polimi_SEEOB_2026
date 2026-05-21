import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import {
  buildScoreFormulaDetails,
  getScoreFormulaDetails,
  SCORE_FORMULA_KEYS,
} from "../src/lib/analysis-score-formulas.mjs";

function metricByKey(details, key) {
  const metric = details.metrics.find((item) => item.key === key);
  assert.ok(metric, `Missing metric ${key}`);
  return metric;
}

function roundedTotal(metric) {
  return Number(
    metric.terms
      .reduce((sum, term) => sum + (term.contribution ?? 0), 0)
      .toFixed(6),
  );
}

async function writeGeojson(root, relativePath, propertiesRows) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = {
    type: "FeatureCollection",
    features: propertiesRows.map((properties) => ({
      type: "Feature",
      properties,
      geometry: null,
    })),
  };
  await writeFile(filePath, gzipSync(JSON.stringify(payload)));
}

test("score formula details expose dashboard metric keys", () => {
  assert.deepEqual(SCORE_FORMULA_KEYS, [
    "svi_score",
    "pt_deficit_score",
    "essential_services_deficit_score",
    "eo_territorial_disadvantage_score",
  ]);
});

test("score formula loader reads strict summary layers instead of old all-fields data", async () => {
  const source = await readFile(
    new URL("../src/lib/analysis-score-formulas.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /h3_combined_priority_all_fields/);
  assert.match(source, /h3_social_vulnerability_index\.geojson\.gz/);
  assert.match(source, /h3_intervention_priority_index\.geojson\.gz/);
  assert.match(source, /h3_public_transport_deficit\.geojson\.gz/);
  assert.match(source, /h3_essential_services_deficit\.geojson\.gz/);
  assert.match(source, /h3_eo_territorial_disadvantage\.geojson\.gz/);
});

test("ptal deficit decomposes into full scale minus normalized PTAL accessibility", () => {
  const details = buildScoreFormulaDetails({
    ptalRecords: [
      {
        h3_id: "abc",
        PTD: 0.66,
        PTA: 0.34,
        SA: 0.2,
        FR: 0.4,
        LA: 0.5,
        HA: 0.1,
        PTAL_PTOL: 0.6,
        ai: 2.4,
        accessible_services: 12,
        accessible_saps: 8,
        accessible_operators: 3,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "pt_deficit_score");

  assert.equal(metric.value, 66);
  assert.match(metric.formula, /PTD = 100 \* \(1 - PTA\)/);
  assert.equal(roundedTotal(metric), 66);
  assert.deepEqual(
    metric.terms.map((term) => term.label),
    ["Full deficit scale", "PTA accessibility offset"],
  );
  assert.equal(metric.sourceValues[0].label, "PTAL AI");
  assert.deepEqual(
    metric.sourceValues
      .filter((item) =>
        [
          "PTA normalized accessibility",
          "Stop access (SA)",
          "Frequency (FR)",
          "Line availability (LA)",
          "Hub access (HA)",
          "PTAL/PTOL component",
        ].includes(item.label),
      )
      .map((item) => [item.label, item.value]),
    [
      ["PTA normalized accessibility", 34],
      ["Stop access (SA)", 20],
      ["Frequency (FR)", 40],
      ["Line availability (LA)", 50],
      ["Hub access (HA)", 10],
      ["PTAL/PTOL component", 60],
    ],
  );
});

test("ptal deficit details use the visible dashboard score for selected H3 cells", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "score-formula-ptal-"));

  try {
    await writeGeojson(root, "data/geojson/analysis/h3_intervention_priority_index.geojson.gz", [
      {
        h3_id: "abc",
        pt_deficit_score: 100,
      },
    ]);
    await writeGeojson(root, "data/geojson/ptal/h3_public_transport_deficit.geojson.gz", [
      {
        h3_id: "abc",
        PTD: 0.94978,
        PTA: 0.05022,
        SA: 0,
        FR: 0,
        LA: 0,
        HA: 0.33477,
        PTAL_PTOL: 0,
      },
    ]);

    const details = getScoreFormulaDetails({
      root,
      h3Id: "abc",
      metricKey: "pt_deficit_score",
    });
    const metric = metricByKey(details, "pt_deficit_score");

    assert.equal(metric.value, 100);
    assert.equal(roundedTotal(metric), 100);
    assert.deepEqual(
      metric.sourceValues
        .filter((item) =>
          [
            "PTA normalized accessibility",
            "Stop access (SA)",
            "Frequency (FR)",
            "Line availability (LA)",
            "Hub access (HA)",
            "PTAL/PTOL component",
          ].includes(item.label),
        )
        .map((item) => [item.label, item.value]),
      [
        ["PTA normalized accessibility", 0],
        ["Stop access (SA)", 0],
        ["Frequency (FR)", 0],
        ["Line availability (LA)", 0],
        ["Hub access (HA)", 33.477],
        ["PTAL/PTOL component", 0],
      ],
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("essential service deficit sums equal weighted service deficits", () => {
  const details = buildScoreFormulaDetails({
    serviceRecords: [
      {
        h3_id: "abc",
        ESD: 0.7,
        HealthAccess: 0.2,
        SchoolAccess: 0.4,
        JobAccess: 0.6,
        GroceryAccess: 0,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "essential_services_deficit_score");

  assert.equal(metric.value, 70);
  assert.match(metric.formula, /ESD = mean/);
  assert.equal(roundedTotal(metric), 70);
  assert.deepEqual(
    metric.terms.map((term) => term.contribution),
    [20, 15, 10, 25],
  );
});

test("single-metric formula requests do not require unrelated source files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "score-formula-"));

  try {
    await writeGeojson(root, "data/geojson/services/h3_essential_services_deficit.geojson.gz", [
      {
        h3_id: "abc",
        ESD: 0.6,
      },
    ]);

    const details = getScoreFormulaDetails({
      root,
      h3Id: "abc",
      metricKey: "essential_services_deficit_score",
    });

    assert.equal(details.metrics.length, 1);
    assert.equal(details.scope.h3Id, "abc");
    assert.equal(details.metrics[0].value, 60);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("eo territorial disadvantage sums weighted EO sub-scores", () => {
  const details = buildScoreFormulaDetails({
    eoRecords: [
      {
        h3_id: "abc",
        EOTD: 0.34,
        SI: 0.5,
        DS: 0.2,
        GP: 0.1,
        DI: 0.4,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "eo_territorial_disadvantage_score");

  assert.equal(metric.value, 34);
  assert.match(metric.formula, /0.45 \* SI/);
  assert.doesNotMatch(metric.formula, /0.40 \* SI/);
  assert.equal(roundedTotal(metric), 34);
});

test("strict SVI inputs use the recalculated weighted components", () => {
  const details = buildScoreFormulaDetails({
    vulnerabilityRecords: [
      {
        h3_id: "abc",
        SVI: 0.53,
        Elderly: 0.8,
        Labour: 0.6,
        Education: 0.4,
        Citizenship: 0.2,
        Income: 0.5,
        LowCarAccess: 0.6,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "svi_score");

  assert.equal(metric.value, 53);
  assert.match(metric.formula, /0\.20 \* Elderly/);
  assert.equal(roundedTotal(metric), 53);
});

test("social vulnerability source ranks are scaled to the displayed filled index", () => {
  const details = buildScoreFormulaDetails({
    analysisRecords: [
      {
        h3_id: "abc",
        svi_score: 36,
        vulnerability_index_filled: 0.36,
      },
    ],
    vulnerabilityRecords: [
      {
        h3_id: "abc",
        vulnerability_index: 0.6,
        vulnerability_index_filled: 0.36,
        children_0_14_share_pct_rank: 0.6,
        elderly_65_plus_share_pct_rank: 0.6,
        female_share_pct_rank: 0.6,
        extra_eu_share_pct_rank: 0.6,
        not_employed_15_64_share_pct_rank: 0.6,
        low_education_share_pct_rank: 0.6,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "svi_score");

  assert.equal(metric.value, 36);
  assert.match(metric.formula, /six percentile ranks/);
  assert.equal(roundedTotal(metric), 36);
  assert.equal(metric.terms[0].weight, 0.1);
});
