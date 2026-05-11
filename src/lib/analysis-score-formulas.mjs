import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const SCORE_FORMULA_KEYS = [
  "svi_score",
  "pt_deficit_score",
  "essential_services_deficit_score",
  "eo_territorial_disadvantage_score",
];

const DATA_FILES = {
  analysis: "data/geojson/analysis/tp_ipt_analysis_h3_res9.geojson.gz",
  vulnerability:
    "data/geojson/vulnerability/milan_metropolitan_vulnerability_h3_res9_2023.geojson.gz",
  services:
    "data/geojson/services/essential_services_accessibility_h3_res9_fast.geojson.gz",
  ptal: "data/geojson/ptal/ptal_4_8_h3_100m_gtfs_netex_fast.geojson.gz",
};

const FORMULA_DATA_KEYS = {
  svi_score: ["analysisRecords", "vulnerabilityRecords"],
  pt_deficit_score: ["analysisRecords", "ptalRecords"],
  essential_services_deficit_score: ["analysisRecords", "serviceRecords"],
  eo_territorial_disadvantage_score: ["analysisRecords"],
};

const DATA_KEY_FILES = {
  analysisRecords: DATA_FILES.analysis,
  vulnerabilityRecords: DATA_FILES.vulnerability,
  serviceRecords: DATA_FILES.services,
  ptalRecords: DATA_FILES.ptal,
};

const FORMULA_SOURCES = [
  "6666/final_result/webgis_data/tp_ipt_final/outputs/reports/final_scoring_methodology.md",
  "6666/final_result/source_methods_and_metrics/Social Vulnerability Index/docs/sources/vulnerability_method_2023.md",
  "6666/final_result/source_methods_and_metrics/Essential Services Accessibility Index/docs/methodology.md",
  "6666/final_result/source_methods_and_metrics/milan_eo_territorial_context/docs/methodology.md",
];

const SOCIAL_VULNERABILITY_COMPONENTS = [
  {
    key: "children_0_14_share_pct_rank",
    label: "Children aged 0-14 rank",
  },
  {
    key: "elderly_65_plus_share_pct_rank",
    label: "Residents aged 65+ rank",
  },
  {
    key: "female_share_pct_rank",
    label: "Female residents rank",
  },
  {
    key: "extra_eu_share_pct_rank",
    label: "Extra-EU residents rank",
  },
  {
    key: "not_employed_15_64_share_pct_rank",
    label: "Employment vulnerability rank",
  },
  {
    key: "low_education_share_pct_rank",
    label: "Low education rank",
  },
];

const SERVICE_DEFICIT_COMPONENTS = [
  {
    deficitKey: "healthcare_deficit_score",
    serviceKey: "healthcare_score",
    label: "Healthcare deficit",
  },
  {
    deficitKey: "school_deficit_score",
    serviceKey: "school_score",
    label: "School deficit",
  },
  {
    deficitKey: "jobs_deficit_score",
    serviceKey: "jobs_score",
    label: "Jobs deficit",
  },
  {
    deficitKey: "grocery_deficit_score",
    serviceKey: "grocery_score",
    label: "Grocery deficit",
  },
];

const EO_COMPONENTS = [
  {
    key: "structural_isolation_score",
    label: "Structural isolation (SI)",
    weight: 0.4,
  },
  {
    key: "dispersed_settlement_pressure_score",
    label: "Dispersed settlement pressure (DS)",
    weight: 0.25,
  },
  {
    key: "growth_pressure_score",
    label: "Growth pressure (GP)",
    weight: 0.2,
  },
  {
    key: "demand_settlement_intensity_score",
    label: "Demand and settlement intensity (DI)",
    weight: 0.15,
  },
];

let cachedFormulaData = null;

export function loadScoreFormulaData(root = process.cwd(), metricKey) {
  if (cachedFormulaData?.root !== root) {
    cachedFormulaData = { root, data: {} };
  }

  const data = cachedFormulaData.data;
  for (const dataKey of formulaDataKeys(metricKey)) {
    if (!data[dataKey]) {
      data[dataKey] = readGeojsonProperties(root, DATA_KEY_FILES[dataKey]);
    }
  }

  return {
    analysisRecords: data.analysisRecords ?? [],
    vulnerabilityRecords: data.vulnerabilityRecords ?? [],
    serviceRecords: data.serviceRecords ?? [],
    ptalRecords: data.ptalRecords ?? [],
  };
}

/**
 * @param {{ root?: string, h3Id?: string, metricKey?: string }} [options]
 */
export function getScoreFormulaDetails(options = {}) {
  const { root = process.cwd(), h3Id, metricKey } = options;
  const data = loadScoreFormulaData(root, metricKey);
  return buildScoreFormulaDetails({ ...data, h3Id, metricKey });
}

function formulaDataKeys(metricKey) {
  if (metricKey) {
    return FORMULA_DATA_KEYS[metricKey] ?? ["analysisRecords"];
  }

  return Array.from(new Set(Object.values(FORMULA_DATA_KEYS).flat()));
}

export function buildScoreFormulaDetails({
  analysisRecords,
  vulnerabilityRecords = [],
  serviceRecords = [],
  ptalRecords = [],
  h3Id,
  metricKey,
}) {
  const analysis = pickRecord(analysisRecords, h3Id);
  const vulnerability = pickRecord(vulnerabilityRecords, h3Id);
  const services = pickRecord(serviceRecords, h3Id);
  const ptal = pickRecord(ptalRecords, h3Id);
  const selectedH3Id = textValue(analysis, "h3_id") || textValue(vulnerability, "h3_id");
  const metrics = [
    buildSocialVulnerabilityMetric(analysis, vulnerability),
    buildPtalDeficitMetric(analysis, ptal),
    buildEssentialServicesMetric(analysis, services),
    buildEoMetric(analysis),
  ].filter((item) => !metricKey || item.key === metricKey);

  return {
    scope: {
      type: selectedH3Id ? "h3" : "citywide",
      h3Id: selectedH3Id || null,
      label: selectedH3Id
        ? `${textValue(analysis, "municipality_name") || "Selected H3"} / ${selectedH3Id}`
        : "Milan metropolitan citywide mean",
    },
    sources: FORMULA_SOURCES,
    metrics,
  };
}

function buildSocialVulnerabilityMetric(analysis, vulnerability) {
  const displayValue = scoreValue(analysis, "svi_score", [
    analysis,
    vulnerability,
    "vulnerability_index_filled",
  ]);
  const filledIndex = normalizedValue(analysis, "vulnerability_index_filled")
    ?? normalizedValue(vulnerability, "vulnerability_index_filled")
    ?? displayValue / 100;
  const sourceIndex = normalizedValue(vulnerability, "vulnerability_index")
    ?? average(
      SOCIAL_VULNERABILITY_COMPONENTS.map((component) =>
        normalizedValue(vulnerability, component.key),
      ),
    )
    ?? filledIndex;
  const fillFactor = sourceIndex > 0 ? filledIndex / sourceIndex : 0;
  let terms = SOCIAL_VULNERABILITY_COMPONENTS.map((component) => {
    const rank = normalizedValue(vulnerability, component.key);
    if (rank == null) return null;
    return {
      label: component.label,
      value: round(rank * 100),
      weight: round(fillFactor / SOCIAL_VULNERABILITY_COMPONENTS.length, 6),
      contribution: round(rank * 100 * fillFactor / SOCIAL_VULNERABILITY_COMPONENTS.length),
      description: "Percentile rank contribution after applying the populated-cell fill factor.",
    };
  }).filter(Boolean);

  if (!terms.length) {
    terms = [
      {
        label: "Filled vulnerability index",
        value: round(filledIndex),
        weight: 100,
        contribution: round(displayValue),
        description: "Fallback when the six source ranks are not present in the selected record.",
      },
    ];
  }
  terms = reconcileTerms(terms, displayValue);

  return {
    key: "svi_score",
    label: "Social vulnerability",
    value: round(displayValue),
    formula:
      "SVI = mean of six percentile ranks; displayed score = 100 * vulnerability_index_filled",
    equation: `${formatNumber(displayValue)} = sum(six indicator rank contributions)`,
    summary:
      "The visible score is the filled social vulnerability index scaled to 0-100.",
    terms,
    sourceValues: [
      sourceValue("Filled vulnerability index", filledIndex),
      sourceValue("Source vulnerability index", sourceIndex),
      sourceValue("Fill factor", fillFactor),
    ].filter(Boolean),
    notes: [
      "The filled index uses zero for cells without resident population, so the source rank contributions are scaled by the fill factor.",
    ],
  };
}

function buildPtalDeficitMetric(analysis, ptal) {
  const displayValue = scoreValue(analysis, "pt_deficit_score", [
    analysis,
    "transport_access_score_mean",
  ]);
  const pta = clamp01(1 - displayValue / 100);
  const terms = reconcileTerms([
    {
      label: "Full deficit scale",
      value: 100,
      weight: 1,
      contribution: 100,
      description: "A cell starts from 100 possible deficit points.",
    },
    {
      label: "PTA accessibility offset",
      value: round(pta * 100),
      weight: -1,
      contribution: round(-pta * 100),
      description: "Normalized PTAL accessibility subtracts from the deficit.",
    },
  ], displayValue);

  return {
    key: "pt_deficit_score",
    label: "PTAL deficit",
    value: round(displayValue),
    formula: "PTD = 100 * (1 - PTA)",
    equation: `${formatNumber(displayValue)} = 100 - ${formatNumber(pta * 100)}`,
    summary:
      "The visible score is the public transport deficit after subtracting normalized PTAL accessibility.",
    terms,
    sourceValues: [
      sourceValue("PTAL AI", numberValue(ptal, "ai")),
      sourceValue("PTA normalized accessibility", pta),
      sourceValue("Accessible services", numberValue(ptal, "accessible_services")),
      sourceValue("Service access points", numberValue(ptal, "accessible_saps")),
      sourceValue("Operators", numberValue(ptal, "accessible_operators")),
    ].filter(Boolean),
    notes: [
      "PTA is derived from robust-normalized PTAL AI in the scoring pipeline. The dashboard layer stores the final deficit score, so the modal derives PTA as 1 - PTD.",
    ],
  };
}

function buildEssentialServicesMetric(analysis, services) {
  const displayValue = scoreValue(analysis, "essential_services_deficit_score", [
    analysis,
    "essential_services_accessibility_score",
  ]);
  const terms = reconcileTerms(SERVICE_DEFICIT_COMPONENTS.map((component) => {
    const deficit = scoreValue(analysis, component.deficitKey, [
      services,
      component.serviceKey,
      "invert",
    ]);
    return {
      label: component.label,
      value: round(deficit),
      weight: 0.25,
      contribution: round(deficit * 0.25),
      description: "Equal one-quarter contribution to the essential services deficit.",
    };
  }), displayValue);

  return {
    key: "essential_services_deficit_score",
    label: "Essential services deficit",
    value: round(displayValue),
    formula:
      "ESD = mean(healthcare deficit, school deficit, jobs deficit, grocery deficit)",
    equation: `${formatNumber(displayValue)} = ${terms
      .map((term) => formatNumber(term.contribution))
      .join(" + ")}`,
    summary:
      "The visible score is the average lack of access across healthcare, schools, jobs and groceries.",
    terms,
    sourceValues: [
      sourceValue(
        "Essential services accessibility index",
        normalizedValue(analysis, "essential_services_accessibility_score")
          ?? normalizedValue(services, "essential_services_accessibility_index"),
      ),
      sourceValue("Nearest healthcare (m)", numberValue(services, "nearest_healthcare_structure_m")),
      sourceValue("Nearest pharmacy (m)", numberValue(services, "nearest_pharmacy_m")),
      sourceValue("Nearest school (m)", numberValue(services, "nearest_school_m")),
      sourceValue("Nearest official food retail (m)", numberValue(services, "nearest_official_food_retail_m")),
      sourceValue("Nearest OSM grocery (m)", numberValue(services, "nearest_osm_grocery_m")),
    ].filter(Boolean),
    notes: [
      "The accessibility workflow combines service distances and job opportunity scores, then the dashboard displays the inverse deficit.",
    ],
  };
}

function buildEoMetric(analysis) {
  const displayValue = scoreValue(analysis, "eo_territorial_disadvantage_score");
  const terms = reconcileTerms(EO_COMPONENTS.map((component) => {
    const value = scoreValue(analysis, component.key);
    return {
      label: component.label,
      value: round(value),
      weight: component.weight,
      contribution: round(value * component.weight),
      description: "Weighted EO territorial component.",
    };
  }), displayValue);

  return {
    key: "eo_territorial_disadvantage_score",
    label: "EO territorial disadvantage",
    value: round(displayValue),
    formula: "EOTD = 0.40 * SI + 0.25 * DS + 0.20 * GP + 0.15 * DI",
    equation: `${formatNumber(displayValue)} = ${terms
      .map((term) => formatNumber(term.contribution))
      .join(" + ")}`,
    summary:
      "The visible score is the weighted EO territorial context disadvantage score.",
    terms,
    sourceValues: [
      sourceValue("Population mask", numberValue(analysis, "population_mask")),
      sourceValue("Night lights score", scoreValue(analysis, "night_lights_score")),
      sourceValue("Built-up score", scoreValue(analysis, "built_up_score")),
      sourceValue("Urban growth score", scoreValue(analysis, "urban_growth_score")),
    ].filter(Boolean),
    notes: [
      "The current dashboard layer stores EO sub-scores on a 0-100 scale; their weighted sum reconstructs the displayed EO disadvantage score.",
    ],
  };
}

function readGeojsonProperties(root, relativePath) {
  const filePath = path.join(root, relativePath);
  const raw = fs.readFileSync(filePath);
  const text = relativePath.endsWith(".gz")
    ? zlib.gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  const json = JSON.parse(text);
  return (json.features ?? []).map((feature) => feature.properties ?? {});
}

function pickRecord(records = [], h3Id) {
  if (h3Id) {
    const match = records.find((record) => textValue(record, "h3_id") === h3Id);
    if (match) return match;
  }

  return aggregateRecords(records);
}

function aggregateRecords(records = []) {
  const sums = new Map();
  const counts = new Map();

  for (const record of records) {
    for (const [key, rawValue] of Object.entries(record ?? {})) {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      sums.set(key, (sums.get(key) ?? 0) + value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const aggregate = {};
  for (const [key, sum] of sums) {
    aggregate[key] = sum / counts.get(key);
  }
  return aggregate;
}

function textValue(record, key) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(record, key) {
  const value = Number(record?.[key]);
  return Number.isFinite(value) ? value : null;
}

function normalizedValue(record, key) {
  const value = numberValue(record, key);
  if (value == null) return null;
  return value > 1 ? value / 100 : value;
}

function scoreValue(record, key, fallback) {
  const value = numberValue(record, key);
  if (value != null) return value <= 1 ? value * 100 : value;

  if (Array.isArray(fallback)) {
    const [fallbackRecord, fallbackKey, mode] = fallback;
    const fallbackValue = numberValue(fallbackRecord, fallbackKey);
    if (fallbackValue != null) {
      const score = fallbackValue <= 1 ? fallbackValue * 100 : fallbackValue;
      return mode === "invert" ? 100 - score : score;
    }
  }

  return 0;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function sourceValue(label, value) {
  if (value == null || !Number.isFinite(value)) return null;
  return {
    label,
    value: round(value),
  };
}

function reconcileTerms(terms, expectedTotal) {
  const total = terms.reduce((sum, term) => sum + (term.contribution ?? 0), 0);
  const delta = round(expectedTotal - total);
  if (Math.abs(delta) < 0.01) return terms;

  return [
    ...terms,
    {
      label: "Aggregation and rounding adjustment",
      value: round(Math.abs(delta)),
      weight: 1,
      contribution: delta,
      description:
        "Aligns the component sum with the precomputed H3 dashboard score after aggregation and rounding.",
    },
  ];
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}
