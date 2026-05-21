import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  brotliCompressSync,
  brotliDecompressSync,
  constants,
  gunzipSync,
  gzipSync,
} from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(ROOT, "data", "geojson");

const analysisPriorityProps = [
  "h3_id",
  "municipality_id",
  "municipality_name",
  "sampled_100m_cells",
  "total_ghsl_population_count",
  "intervention_priority_score",
  "intervention_priority_formula_score",
  "priority_score_0_100",
  "priority_class",
  "hotspot_score",
  "TPHS",
  "TPHS_class",
  "data_confidence_score",
  "DCS",
  "confidence_class",
  "pt_deficit_score",
  "essential_services_deficit_score",
  "svi_score",
  "eo_territorial_disadvantage_score",
  "city2graph_network_penalty_score",
  "IPI",
  "SVI",
  "PTD",
  "ESD",
  "EOTD",
  "GM",
  "typology",
  "dominant_drivers",
  "suggested_intervention_family",
  "transit_dependency_diagnosis",
  "recommended_gtfs_action",
  "primary_route_line",
  "primary_route_mode",
  "primary_route_operator",
  "primary_stop_id",
  "local_validation_needs",
  "possible_kpis",
];

const displayJobs = [
  {
    source: "analysis/h3_intervention_priority_index.geojson",
    keepProps: analysisPriorityProps,
  },
  {
    source: "analysis/h3_transport_poverty_hotspot_score.geojson",
    keepProps: [
      "h3_id",
      "municipality_id",
      "municipality_name",
      "sampled_100m_cells",
      "total_ghsl_population_count",
      "TPHS",
      "TPHS_class",
      "SVI",
      "PTD",
      "ESD",
      "EOTD",
      "interaction_multiplier",
      "dominant_drivers",
    ],
  },
  {
    source: "analysis/h3_data_confidence_score.geojson",
    keepProps: [
      "h3_id",
      "municipality_id",
      "municipality_name",
      "sampled_100m_cells",
      "total_ghsl_population_count",
      "DCS",
      "confidence_class",
      "DCS_source_completeness",
      "DCS_spatial_resolution",
      "DCS_temporal_freshness",
      "DCS_data_directness",
    ],
  },
  {
    source: "analysis/h3_hotspot_typology.geojson",
    keepProps: [
      "h3_id",
      "municipality_id",
      "municipality_name",
      "sampled_100m_cells",
      "total_ghsl_population_count",
      "typology",
      "dominant_drivers",
      "suggested_intervention_family",
      "DUS",
      "DRF",
      "GTM",
      "ABD",
      "SDT",
    ],
  },
  { source: "ptal/h3_public_transport_accessibility.geojson" },
  { source: "ptal/h3_public_transport_deficit.geojson" },
  { source: "ptal/h3_pt_service_frequency.geojson" },
  { source: "ptal/h3_pt_line_availability.geojson" },
  {
    source: "ptal/ptal_4_8_h3_100m_gtfs_netex_web.geojson",
    precision: 4,
    keepProps: [
      "h3_id",
      "ptal",
      "ai",
      "accessible_services",
      "accessible_saps",
      "accessible_operators",
      "mean_wait_min",
      "mean_walk_min",
      "top_operator",
      "bus",
      "tram",
      "metro",
      "rail",
      "other",
    ],
  },
  {
    source: "ptal/ptol_4_8_h3_100m_gtfs_netex_web.geojson",
    precision: 4,
    keepProps: [
      "h3_id",
      "ptol",
      "ptol_mean",
      "nearest_pt_stop_walk_min",
      "ptol_modes",
      "bus_access",
      "tram_access",
      "metro_access",
      "rail_access",
    ],
  },
  { source: "ptal/stops_all_gtfs_netex.geojson" },
  { source: "services/h3_essential_services_accessibility.geojson" },
  { source: "services/h3_essential_services_deficit.geojson" },
  { source: "services/h3_health_access.geojson" },
  { source: "services/h3_school_access.geojson" },
  { source: "services/h3_job_access.geojson" },
  { source: "services/h3_grocery_access.geojson" },
  { source: "services/milan_essential_services_points.geojson" },
  { source: "vulnerability/h3_svi_elderly.geojson" },
  { source: "vulnerability/h3_svi_labour.geojson" },
  { source: "vulnerability/h3_svi_education.geojson" },
  { source: "vulnerability/h3_svi_citizenship.geojson" },
  { source: "vulnerability/h3_svi_income.geojson" },
  { source: "vulnerability/h3_svi_motorisation.geojson" },
  { source: "vulnerability/h3_svi_low_car_access.geojson" },
  { source: "vulnerability/h3_car_dependency_stress.geojson" },
  { source: "vulnerability/h3_social_vulnerability_index.geojson" },
  { source: "earth-observation/h3_eo_territorial_disadvantage.geojson" },
  { source: "earth-observation/h3_population_demand.geojson" },
  { source: "earth-observation/h3_built_up_density.geojson" },
  { source: "earth-observation/h3_artificial_land_cover.geojson" },
  {
    source: "earth-observation/eo_artificial_land_cover_100m.geojson",
    precision: 4,
    keepProps: [
      "grid_id",
      "landcover_artificial_share",
      "artificial_landcover_class",
    ],
  },
  { source: "earth-observation/h3_night_time_lights.geojson" },
  {
    source: "earth-observation/eo_night_lights_sdgsat1_100m_fast.geojson",
    precision: 4,
    keepProps: [
      "grid_id",
      "ntl_sdgsat1_lh_score",
      "night_lights_sdgsat1_lh_mean_2022_2023",
      "sdgsat1_night_lights_class",
    ],
  },
  { source: "earth-observation/h3_road_density.geojson" },
  { source: "earth-observation/h3_intersection_density.geojson" },
  { source: "earth-observation/h3_road_connectivity.geojson" },
  { source: "earth-observation/h3_green_open_land.geojson" },
  { source: "earth-observation/h3_urban_growth.geojson" },
  { source: "context/citta_metropolitana_milano_boundary.geojson" },
];

function readGeoJson(sourcePath) {
  const assetPath = [sourcePath, `${sourcePath}.br`, `${sourcePath}.gz`].find(
    (candidate) => existsSync(candidate),
  );

  if (!assetPath) {
    throw new Error(`Missing source GeoJSON: ${path.relative(ROOT, sourcePath)}`);
  }

  const bytes = readFileSync(assetPath);
  const rawBytes = assetPath.endsWith(".br")
    ? brotliDecompressSync(bytes)
    : assetPath.endsWith(".gz")
      ? gunzipSync(bytes)
      : bytes;

  return {
    assetPath,
    bytes: rawBytes,
    data: JSON.parse(rawBytes.toString("utf8")),
  };
}

function cleanValue(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(4));
  }

  return value;
}

function roundCoordinates(value, precision) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(precision));
  }

  if (Array.isArray(value)) {
    return value.map((item) => roundCoordinates(item, precision));
  }

  return value;
}

function compactProperties(properties, keepProps) {
  const source = properties ?? {};
  const entries = keepProps
    ? keepProps.map((key) => [key, source[key]])
    : Object.entries(source);

  return Object.fromEntries(
    entries
      .map(([key, value]) => [key, cleanValue(value)])
      .filter(([, value]) => value !== null && value !== undefined && value !== ""),
  );
}

function displayPathFor(sourcePath) {
  return sourcePath.replace(/\.geojson$/, ".display.geojson");
}

function buildDisplayGeoJson(job) {
  const sourcePath = path.join(DATA_ROOT, job.source);
  const targetPath = displayPathFor(sourcePath);
  const targetGzipPath = `${targetPath}.gz`;
  const targetBrotliPath = `${targetPath}.br`;
  const source = readGeoJson(sourcePath);
  const sourceMtime = statSync(source.assetPath).mtimeMs;

  if (
    existsSync(targetGzipPath) &&
    existsSync(targetBrotliPath) &&
    statSync(targetGzipPath).mtimeMs >= sourceMtime &&
    statSync(targetBrotliPath).mtimeMs >= sourceMtime
  ) {
    return {
      source: path.relative(ROOT, sourcePath),
      rawBytes: source.bytes.byteLength,
      displayBytes: null,
      skipped: true,
    };
  }

  const data = source.data;
  const precision = job.precision ?? 5;
  const output = {
    type: "FeatureCollection",
    features: (data.features ?? []).map((feature) => ({
      type: "Feature",
      properties: compactProperties(feature.properties, job.keepProps),
      geometry: feature.geometry
        ? {
            type: feature.geometry.type,
            coordinates: roundCoordinates(feature.geometry.coordinates, precision),
          }
        : null,
    })),
  };
  const raw = Buffer.from(JSON.stringify(output));

  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(
    targetGzipPath,
    gzipSync(raw, { level: 9 }),
  );
  writeFileSync(
    targetBrotliPath,
    brotliCompressSync(raw, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
      },
    }),
  );

  return {
    source: path.relative(ROOT, sourcePath),
    rawBytes: source.bytes.byteLength,
    displayBytes: raw.byteLength,
    skipped: false,
  };
}

for (const job of displayJobs) {
  const result = buildDisplayGeoJson(job);
  const rawMb = (result.rawBytes / 1024 / 1024).toFixed(2);
  const displayMb =
    result.displayBytes == null
      ? "current"
      : `${(result.displayBytes / 1024 / 1024).toFixed(2)} MB`;

  console.log(
    `${result.source}: ${rawMb} MB -> ${displayMb} display${
      result.skipped ? " (skipped)" : ""
    }`,
  );
}
