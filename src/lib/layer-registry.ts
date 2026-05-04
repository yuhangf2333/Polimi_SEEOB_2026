import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type LayerKind = "polygon" | "line" | "point" | "mixed";

export type LayerGroupId =
  | "analysis"
  | "ptal"
  | "services"
  | "vulnerability"
  | "earth-observation"
  | "context";

export type LayerPalette =
  | "green"
  | "blue"
  | "red"
  | "purple"
  | "pink"
  | "brown"
  | "orange";

export type LayerStyle = {
  color: string;
  opacity: number;
};

export type MilanLayer = {
  id: string;
  group: LayerGroupId;
  name: string;
  description: string;
  kind: LayerKind;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  defaultVisible?: boolean;
  style: LayerStyle;
  thematicProperty?: string;
  thematicProperties?: string[];
  thematicRankProperty?: string;
  thematicClassProperty?: string;
  palette?: LayerPalette;
};

export type PublicMilanLayer = Omit<MilanLayer, "filePath"> & {
  sizeLabel: string;
  isLarge: boolean;
};

export type MilanLayerGroup = {
  id: LayerGroupId;
  name: string;
  description: string;
  color: string;
  layers: PublicMilanLayer[];
};

const DATA_ROOT = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  "data",
  "geojson",
);

const colors = {
  analysis: "#2563eb",
  ptal: "#2563eb",
  services: "#10b981",
  vulnerability: "#f97316",
  eo: "#8b5cf6",
  context: "#06b6d4",
};

export const layerGroupMeta: Record<
  LayerGroupId,
  Omit<MilanLayerGroup, "layers">
> = {
  analysis: {
    id: "analysis",
    name: "Analysis",
    description: "TP-IPT decision analysis, hotspot, confidence and intervention layers.",
    color: colors.analysis,
  },
  ptal: {
    id: "ptal",
    name: "Public Transport Accessibility",
    description: "PTAL, PTOL, stops and NetEx accessibility surfaces.",
    color: colors.ptal,
  },
  services: {
    id: "services",
    name: "Essential Services",
    description: "Healthcare, education, grocery and employment access.",
    color: colors.services,
  },
  vulnerability: {
    id: "vulnerability",
    name: "Social Vulnerability",
    description: "Age, employment, gender, education, citizenship and index layers.",
    color: colors.vulnerability,
  },
  "earth-observation": {
    id: "earth-observation",
    name: "EO Territorial Context",
    description: "Earth observation and municipal context outputs.",
    color: colors.eo,
  },
  context: {
    id: "context",
    name: "Boundaries & Context",
    description: "Administrative boundary layers used as map context.",
    color: colors.context,
  },
};

export const milanLayers: MilanLayer[] = [
  ...readAnalysisLayers(),
  ...readPublicTransportLayers(),
  ...readServicesLayers(),
  ...readEarthObservationLayers(),
  ...readVulnerabilityLayers(),
];

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getLayerById(id: string) {
  return milanLayers.find((layer) => layer.id === id);
}

export function getPublicLayers(): PublicMilanLayer[] {
  return milanLayers.map((layer) => ({
    id: layer.id,
    group: layer.group,
    name: layer.name,
    description: layer.description,
    kind: layer.kind,
    fileName: layer.fileName,
    sizeBytes: layer.sizeBytes,
    defaultVisible: layer.defaultVisible,
    style: layer.style,
    thematicProperty: layer.thematicProperty,
    thematicProperties: layer.thematicProperties,
    thematicRankProperty: layer.thematicRankProperty,
    thematicClassProperty: layer.thematicClassProperty,
    palette: layer.palette,
    sizeLabel: formatBytes(layer.sizeBytes),
    isLarge: layer.sizeBytes >= 50 * 1024 * 1024,
  }));
}

export function getLayerGroups(): MilanLayerGroup[] {
  const publicLayers = getPublicLayers();

  return Object.values(layerGroupMeta).map((group) => ({
    ...group,
    layers: publicLayers.filter((layer) => layer.group === group.id),
  }));
}

function readPublicTransportLayers(): MilanLayer[] {
  const outputDirectory = path.join(DATA_ROOT, "ptal");

  if (!existsSync(outputDirectory)) {
    return [];
  }

  const definitions: Array<
    Omit<MilanLayer, "group" | "filePath" | "sizeBytes">
  > = [
    {
      id: "ptal-public-transport-accessibility-level",
      name: "Public Transport Accessibility Level (PTAL)",
      description:
        "GTFS and NetEx public transport accessibility level at H3 100 m support.",
      kind: "polygon",
      fileName: "ptal_4_8_h3_100m_gtfs_netex_web.geojson",
      defaultVisible: true,
      style: { color: colors.ptal, opacity: 0.62 },
      thematicProperty: "ptal",
    },
    {
      id: "ptal-public-transport-opportunity-level",
      name: "Public Transport Opportunity Level (PTOL)",
      description:
        "GTFS and NetEx public transport opportunity level at H3 100 m support.",
      kind: "polygon",
      fileName: "ptol_4_8_h3_100m_gtfs_netex_web.geojson",
      style: { color: "#0ea5e9", opacity: 0.62 },
      thematicProperty: "ptol",
    },
    {
      id: "ptal-stops-all",
      name: "Stops",
      description: "All GTFS and NetEx public transport stops.",
      kind: "point",
      fileName: "stops_all_gtfs_netex.geojson",
      style: { color: "#111827", opacity: 0.9 },
    },
  ];

  return definitions.flatMap((definition) => {
    const asset = resolveLayerAsset(outputDirectory, definition.fileName);
    if (!asset) return [];

    return {
      ...definition,
      group: "ptal" as const,
      ...asset,
    };
  });
}

function readAnalysisLayers(): MilanLayer[] {
  const outputDirectory = path.join(DATA_ROOT, "analysis");

  if (!existsSync(outputDirectory)) {
    return [];
  }

  const definitions: Array<
    Omit<MilanLayer, "group" | "filePath" | "sizeBytes">
  > = [
    {
      id: "analysis-intervention-priority",
      name: "Intervention priority",
      description:
        "Default TP-IPT decision layer. Robust 0-100 priority score for ranking planning urgency.",
      kind: "polygon",
      fileName: "tp_ipt_analysis_h3_res9.geojson",
      defaultVisible: true,
      style: { color: colors.analysis, opacity: 0.82 },
      thematicProperty: "intervention_priority_score",
      thematicClassProperty: "priority_class",
      palette: "red",
    },
    {
      id: "analysis-hotspot-score",
      name: "Hotspot score",
      description:
        "Transport poverty hotspot score combining social vulnerability, PT deficit, service deficit and EO disadvantage.",
      kind: "polygon",
      fileName: "tp_ipt_analysis_h3_res9.geojson",
      style: { color: "#e11d48", opacity: 0.82 },
      thematicProperty: "hotspot_score",
      thematicClassProperty: "hotspot_class",
      palette: "orange",
    },
    {
      id: "analysis-data-confidence",
      name: "Data confidence",
      description:
        "Weighted source completeness, spatial resolution, temporal freshness and data directness score.",
      kind: "polygon",
      fileName: "tp_ipt_analysis_h3_res9.geojson",
      style: { color: "#0f766e", opacity: 0.82 },
      thematicProperty: "data_confidence_score",
      thematicClassProperty: "confidence_class",
      palette: "green",
    },
    {
      id: "analysis-typology",
      name: "Typology",
      description:
        "Rule-based explanation of why an H3 cell is critical or lower concern.",
      kind: "polygon",
      fileName: "tp_ipt_analysis_h3_res9.geojson",
      style: { color: "#7c3aed", opacity: 0.82 },
      thematicClassProperty: "typology",
      palette: "purple",
    },
    {
      id: "analysis-transit-dependency",
      name: "GTFS/NeTEx dependency",
      description:
        "Transit dependency explanation layer generated from GTFS/NeTEx route and stop relations.",
      kind: "polygon",
      fileName: "gtfs_netex_transit_dependency_h3_res9.geojson",
      style: { color: "#0ea5e9", opacity: 0.78 },
      thematicProperty: "transport_access_score_mean",
      thematicClassProperty: "transit_dependency_diagnosis",
      palette: "blue",
    },
    {
      id: "analysis-hotspot-clusters",
      name: "Hotspot clusters",
      description:
        "Contiguous H3 clusters where hotspot score >= 60 or priority score >= 70.",
      kind: "polygon",
      fileName: "tp_ipt_hotspot_clusters.geojson",
      style: { color: "#f97316", opacity: 0.68 },
      thematicProperty: "priority_score_mean",
      thematicClassProperty: "typology",
      palette: "orange",
    },
    {
      id: "analysis-critical-transit-stops",
      name: "Critical transit stops",
      description:
        "Transit stops ranked by dependent H3 cells and dependency priority score.",
      kind: "point",
      fileName: "critical_transit_stop_nodes.geojson",
      style: { color: "#111827", opacity: 0.9 },
      thematicProperty: "dependency_priority_score",
    },
  ];

  return definitions.flatMap((definition) => {
    const asset = resolveLayerAsset(outputDirectory, definition.fileName);
    if (!asset) return [];

    return {
      ...definition,
      group: "analysis" as const,
      ...asset,
    };
  });
}

function readServicesLayers(): MilanLayer[] {
  const outputDirectory = path.join(DATA_ROOT, "services");

  if (!existsSync(outputDirectory)) {
    return [];
  }

  const definitions: Array<
    Omit<MilanLayer, "group" | "filePath" | "sizeBytes">
  > = [
    {
      id: "services-essential-service-points",
      name: "Essential service points",
      description:
        "Healthcare, education, grocery and employment proxy service points.",
      kind: "point",
      fileName: "service_points_all.geojson",
      defaultVisible: true,
      style: { color: colors.services, opacity: 0.9 },
    },
    {
      id: "services-essential-service-accessibility",
      name: "Essential service accessibility",
      description: "Essential service accessibility index aggregated to H3 res9.",
      kind: "polygon",
      fileName: "essential_services_accessibility_h3_res9.geojson",
      style: { color: colors.services, opacity: 0.82 },
      thematicProperty: "essential_services_accessibility_index",
      thematicClassProperty: "accessibility_class",
      palette: "green",
    },
    {
      id: "services-essential-service-gap",
      name: "Essential service gap",
      description:
        "Priority gap between social vulnerability and essential service access.",
      kind: "polygon",
      fileName: "essential_services_accessibility_h3_res9.geojson",
      style: { color: "#e11d48", opacity: 0.82 },
      thematicProperty: "essential_services_vulnerability_gap",
      thematicClassProperty: "gap_display_class",
      palette: "red",
    },
  ];

  return definitions.flatMap((definition) => {
    const asset = resolveLayerAsset(outputDirectory, definition.fileName);
    if (!asset) return [];

    return {
      ...definition,
      group: "services" as const,
      ...asset,
    };
  });
}

function readVulnerabilityLayers(): MilanLayer[] {
  const outputDirectory = path.join(DATA_ROOT, "vulnerability");
  const boundaryFileName = "boundary_citta_metropolitana_milano.geojson";
  const boundaryFilePath = path.join(outputDirectory, boundaryFileName);

  const layers: MilanLayer[] = [];

  if (existsSync(boundaryFilePath)) {
    layers.push({
      id: "context-boundary-citta-metropolitana-milano",
      group: "context",
      name: "Metro boundary",
      description: "Citta Metropolitana di Milano study boundary.",
      kind: "polygon",
      fileName: boundaryFileName,
      filePath: boundaryFilePath,
      sizeBytes: statSync(boundaryFilePath).size,
      defaultVisible: true,
      style: { color: "#1f2937", opacity: 1 },
    });
  }

  const themes: Array<
    Pick<
      MilanLayer,
      | "id"
      | "name"
      | "description"
      | "thematicProperty"
      | "thematicProperties"
      | "thematicRankProperty"
      | "thematicClassProperty"
      | "palette"
      | "style"
    > & { defaultVisible?: boolean; sourceFileName: string }
  > = [
    {
      id: "vulnerability-age",
      name: "age vulnerability",
      description: "Residents aged 65+ joined to H3 resolution 9 cells.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "elderly_65_plus_share",
      thematicRankProperty: "elderly_65_plus_share_pct_rank",
      palette: "blue",
      style: { color: "#2f6690", opacity: 0.88 },
    },
    {
      id: "vulnerability-employment",
      name: "employment vulnerability",
      description: "Employment proxy for non-employed residents aged 15-64.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "not_employed_15_64_share",
      thematicRankProperty: "not_employed_15_64_share_pct_rank",
      palette: "red",
      style: { color: "#c23b43", opacity: 0.88 },
    },
    {
      id: "vulnerability-gender",
      name: "gender vulnerability",
      description: "Gender vulnerability from female residents share.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "female_share",
      thematicRankProperty: "female_share_pct_rank",
      palette: "purple",
      style: { color: "#6d4b9a", opacity: 0.88 },
    },
    {
      id: "vulnerability-education",
      name: "education vulnerability",
      description: "Education vulnerability from low education share.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "low_education_share",
      thematicRankProperty: "low_education_share_pct_rank",
      palette: "pink",
      style: { color: "#ad3f7d", opacity: 0.88 },
    },
    {
      id: "vulnerability-citizenship",
      name: "citizenship vulnerability",
      description: "Citizenship vulnerability from Extra-EU citizens share.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "extra_eu_share",
      thematicRankProperty: "extra_eu_share_pct_rank",
      palette: "brown",
      style: { color: "#8f5b33", opacity: 0.88 },
    },
    {
      id: "vulnerability-index",
      name: "vulnerability index",
      description: "Composite social vulnerability index.",
      sourceFileName: "milan_metropolitan_vulnerability_h3_res9_2023.geojson",
      thematicProperty: "vulnerability_index_filled",
      thematicClassProperty: "vulnerability_class",
      palette: "orange",
      style: { color: "#d95f02", opacity: 0.88 },
      defaultVisible: true,
    },
  ];

  return [
    ...layers,
    ...themes.flatMap((theme) => {
      const asset = resolveLayerAsset(outputDirectory, theme.sourceFileName);
      if (!asset) return [];
      const { sourceFileName, ...layer } = theme;

      return {
        ...layer,
        group: "vulnerability" as const,
        kind: "polygon" as const,
        fileName: sourceFileName,
        ...asset,
      };
    }),
  ];
}

function readEarthObservationLayers(): MilanLayer[] {
  const outputDirectory = path.join(DATA_ROOT, "earth-observation");

  if (!existsSync(outputDirectory)) {
    return [];
  }

  const definitions: Array<
    Omit<MilanLayer, "group" | "filePath" | "sizeBytes">
  > = [
    {
      id: "earth-observation-sdgsat1-night-lights",
      name: "SDGSAT-1 night lights",
      description:
        "High-resolution night-time lights from GHS-SDGSAT-1 aggregated to the 100 m EO grid.",
      kind: "polygon",
      fileName: "eo_night_lights_sdgsat1_100m.geojson",
      defaultVisible: true,
      style: { color: "#7c3aed", opacity: 0.76 },
      thematicProperty: "ntl_sdgsat1_lh_score",
      thematicClassProperty: "sdgsat1_night_lights_class",
      palette: "purple",
    },
    {
      id: "earth-observation-artificial-land-cover",
      name: "Artificial land-cover",
      description: "Artificial surface share from ESA WorldCover 2021.",
      kind: "polygon",
      fileName: "eo_artificial_land_cover_100m.geojson",
      style: { color: "#f97316", opacity: 0.76 },
      thematicProperty: "landcover_artificial_share",
      thematicClassProperty: "artificial_landcover_class",
      palette: "orange",
    },
    {
      id: "earth-observation-green-open-land-cover",
      name: "Green/open land-cover",
      description: "Green and open land-cover share from ESA WorldCover 2021.",
      kind: "polygon",
      fileName: "eo_green_open_land_cover_100m.geojson",
      style: { color: "#16a34a", opacity: 0.76 },
      thematicProperty: "landcover_green_open_share",
      thematicClassProperty: "green_open_landcover_class",
      palette: "green",
    },
    {
      id: "earth-observation-built-up-density",
      name: "Built-up density",
      description: "Built-up surface density from GHSL GHS-BUILT-S 2020.",
      kind: "polygon",
      fileName: "eo_built_up_density_100m.geojson",
      style: { color: "#dc2626", opacity: 0.76 },
      thematicProperty: "built_up_score",
      thematicClassProperty: "built_up_density_class",
      palette: "red",
    },
    {
      id: "earth-observation-urban-growth-2010-2020",
      name: "Urban growth 2010-2020",
      description: "Built-up expansion from GHSL 2010 to 2020.",
      kind: "polygon",
      fileName: "eo_urban_growth_2010_2020_100m.geojson",
      style: { color: "#e11d48", opacity: 0.76 },
      thematicProperty: "urban_growth_score_2010_2020",
      thematicClassProperty: "urban_growth_2010_2020_class",
      palette: "pink",
    },
  ];

  return definitions.flatMap((definition) => {
    const asset = resolveLayerAsset(outputDirectory, definition.fileName);
    if (!asset) return [];

    return {
      ...definition,
      group: "earth-observation" as const,
      ...asset,
    };
  });
}

function resolveLayerAsset(outputDirectory: string, fileName: string) {
  const filePath = path.join(outputDirectory, fileName);
  const sizePath = [filePath, `${filePath}.br`, `${filePath}.gz`].find((candidate) =>
    existsSync(candidate),
  );

  if (!sizePath) return null;

  return {
    filePath,
    sizeBytes: statSync(sizePath).size,
  };
}
