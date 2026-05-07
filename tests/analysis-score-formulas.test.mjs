import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScoreFormulaDetails,
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

test("score formula details expose dashboard metric keys", () => {
  assert.deepEqual(SCORE_FORMULA_KEYS, [
    "svi_score",
    "pt_deficit_score",
    "essential_services_deficit_score",
    "eo_territorial_disadvantage_score",
  ]);
});

test("ptal deficit decomposes into full scale minus normalized PTAL accessibility", () => {
  const details = buildScoreFormulaDetails({
    analysisRecords: [
      {
        h3_id: "abc",
        pt_deficit_score: 66,
        transport_access_score_mean: 66,
      },
    ],
    ptalRecords: [
      {
        h3_id: "abc",
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
});

test("essential service deficit sums equal weighted service deficits", () => {
  const details = buildScoreFormulaDetails({
    analysisRecords: [
      {
        h3_id: "abc",
        essential_services_deficit_score: 70,
        healthcare_deficit_score: 80,
        school_deficit_score: 60,
        jobs_deficit_score: 40,
        grocery_deficit_score: 100,
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

test("eo territorial disadvantage sums weighted EO sub-scores", () => {
  const details = buildScoreFormulaDetails({
    analysisRecords: [
      {
        h3_id: "abc",
        eo_territorial_disadvantage_score: 33,
        structural_isolation_score: 50,
        dispersed_settlement_pressure_score: 20,
        growth_pressure_score: 10,
        demand_settlement_intensity_score: 40,
      },
    ],
    h3Id: "abc",
  });

  const metric = metricByKey(details, "eo_territorial_disadvantage_score");

  assert.equal(metric.value, 33);
  assert.match(metric.formula, /0.40 \* SI/);
  assert.equal(roundedTotal(metric), 33);
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
