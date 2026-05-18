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
  | "orange"
  | "teal"
  | "indigo";

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
  displayFileName?: string;
  displayFilePath?: string;
  displaySizeBytes?: number;
  defaultVisible?: boolean;
  style: LayerStyle;
  thematicProperty?: string;
  thematicProperties?: string[];
  thematicRankProperty?: string;
  thematicClassProperty?: string;
  palette?: LayerPalette;
  visibleInLayerMenu?: boolean;
};

export type PublicMilanLayer = Omit<MilanLayer, "filePath" | "displayFilePath"> & {
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
    description: "Strict recalculated public transport deficit surface.",
    color: colors.ptal,
  },
  services: {
    id: "services",
    name: "Essential Services",
    description: "Strict recalculated essential services deficit surface.",
    color: colors.services,
  },
  vulnerability: {
    id: "vulnerability",
    name: "Social Vulnerability",
    description: "Strict recalculated Social Vulnerability Index.",
    color: colors.vulnerability,
  },
  "earth-observation": {
    id: "earth-observation",
    name: "EO Territorial Context",
    description: "Strict recalculated EO-Territorial Disadvantage Index.",
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
    displayFileName: layer.displayFileName,
    displaySizeBytes: layer.displaySizeBytes,
    defaultVisible: layer.defaultVisible,
    style: layer.style,
    thematicProperty: layer.thematicProperty,
    thematicProperties: layer.thematicProperties,
    thematicRankProperty: layer.thematicRankProperty,
    thematicClassProperty: layer.thematicClassProperty,
    palette: layer.palette,
    visibleInLayerMenu: layer.visibleInLayerMenu,
    sizeLabel: formatBytes(layer.sizeBytes),
    isLarge: layer.sizeBytes >= 50 * 1024 * 1024,
  }));
}

export function getContextLayers(): PublicMilanLayer[] {
  return getPublicLayers().filter((layer) => layer.group === "context");
}

export function getLayerGroups(): MilanLayerGroup[] {
  const publicLayers = getPublicLayers().filter(
    (layer) => layer.visibleInLayerMenu !== false,
  );

  return Object.values(layerGroupMeta)
    .filter((group) => group.id !== "context")
    .map((group) => ({
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
      id: "ptal-public-transport-accessibility",
      name: "Public transport accessibility",
      description:
        "Strict H3 public transport accessibility computed from stop access, frequency, line availability, hub access, and the PTAL/PTOL component.",
      kind: "polygon",
      fileName: "h3_public_transport_accessibility.geojson",
      style: { color: "#2563eb", opacity: 0.68 },
      thematicProperty: "PTA",
      palette: "blue",
    },
    {
      id: "ptal-public-transport-deficit",
      name: "Public transport deficit",
      description:
        "Strict H3 public transport deficit computed as 1 - public transport accessibility.",
      kind: "polygon",
      fileName: "h3_public_transport_deficit.geojson",
      defaultVisible: true,
      style: { color: "#2563eb", opacity: 0.68 },
      thematicProperty: "PTD",
      palette: "blue",
    },
    {
      id: "ptal-service-frequency",
      name: "Service frequency",
      description: "Strict H3 service-frequency sub-score from reachable public transport frequency per hour.",
      kind: "polygon",
      fileName: "h3_pt_service_frequency.geojson",
      style: { color: "#3b82f6", opacity: 0.66 },
      thematicProperty: "FR",
      palette: "blue",
    },
    {
      id: "ptal-line-availability",
      name: "Line availability",
      description: "Strict H3 line-availability sub-score from accessible public transport line count.",
      kind: "polygon",
      fileName: "h3_pt_line_availability.geojson",
      style: { color: "#1d4ed8", opacity: 0.66 },
      thematicProperty: "LA",
      palette: "blue",
    },
    {
      id: "ptal-ptal-component",
      name: "PTAL component",
      description: "Strict H3 PTAL-like component retained in the public transport accessibility formula.",
      kind: "polygon",
      fileName: "h3_ptal_component.geojson",
      style: { color: "#2563eb", opacity: 0.64 },
      thematicProperty: "PTAL_component",
      palette: "blue",
      visibleInLayerMenu: false,
    },
    {
      id: "ptal-ptal-detailed",
      name: "PTAL detailed 250m",
      description: "Fine 250 m PTAL class surface for inspecting local public transport accessibility levels.",
      kind: "polygon",
      fileName: "milan_metropolitan_ptal_250m.geojson",
      style: { color: "#0ea5b7", opacity: 0.62 },
      thematicProperty: "ptal_order",
      palette: "teal",
      visibleInLayerMenu: false,
    },
    {
      id: "ptal-ptal-100m-gtfs-netex",
      name: "ptal",
      description: "Original 100 m GTFS/NeTEx PTAL class surface retained for fine-grained comparison with the strict H3 component.",
      kind: "polygon",
      fileName: "ptal_4_8_h3_100m_gtfs_netex_web.geojson",
      style: { color: "#0ea5b7", opacity: 0.62 },
      thematicProperty: "ptal",
      palette: "teal",
    },
    {
      id: "ptal-ptol-component",
      name: "PTOL component",
      description: "Strict H3 PTOL-like reachable-mode component retained in the public transport accessibility formula.",
      kind: "polygon",
      fileName: "h3_ptol_component.geojson",
      style: { color: "#2563eb", opacity: 0.64 },
      thematicProperty: "PTOL_component",
      palette: "blue",
      visibleInLayerMenu: false,
    },
    {
      id: "ptal-ptol-detailed",
      name: "PTOL detailed 250m",
      description: "Fine 250 m PTOL opportunity level surface showing locally reachable public transport modes.",
      kind: "polygon",
      fileName: "milan_metropolitan_ptol_official_250m.geojson",
      style: { color: "#1d4ed8", opacity: 0.62 },
      thematicProperty: "ptol",
      palette: "blue",
      visibleInLayerMenu: false,
    },
    {
      id: "ptal-ptol-100m-gtfs-netex",
      name: "ptol",
      description: "Original 100 m GTFS/NeTEx PTOL opportunity surface retained for fine-grained modal opportunity inspection.",
      kind: "polygon",
      fileName: "ptol_4_8_h3_100m_gtfs_netex_web.geojson",
      style: { color: "#1d4ed8", opacity: 0.62 },
      thematicProperty: "ptol",
      palette: "blue",
    },
    {
      id: "ptal-ptal-ptol-component",
      name: "PTAL/PTOL component",
      description: "Strict H3 combined PTAL/PTOL component used in the public transport accessibility formula.",
      kind: "polygon",
      fileName: "h3_ptal_ptol_component.geojson",
      style: { color: "#2563eb", opacity: 0.64 },
      thematicProperty: "PTAL_PTOL",
      palette: "blue",
      visibleInLayerMenu: false,
    },
    {
      id: "ptal-stops-all",
      name: "Stops all",
      description: "All strict GTFS/NeTEx stop and service access points used by the public transport layers.",
      kind: "point",
      fileName: "stops_all_gtfs_netex.geojson",
      style: { color: "#2563eb", opacity: 0.9 },
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
      name: "Intervention priority index",
      description:
        "Strict TP-IPT decision layer. Robust 0-100 Intervention Priority Index for ranking planning urgency.",
      kind: "polygon",
      fileName: "h3_intervention_priority_index.geojson",
      defaultVisible: true,
      style: { color: colors.analysis, opacity: 0.82 },
      thematicProperty: "intervention_priority_score",
      thematicProperties: [
        "intervention_priority_score",
        "intervention_priority_formula_score",
        "IPI",
      ],
      thematicClassProperty: "priority_class",
      palette: "red",
    },
    {
      id: "analysis-hotspot-score",
      name: "Hotspot score",
      description:
        "Transport poverty hotspot score combining social vulnerability, PT deficit, service deficit and EO disadvantage.",
      kind: "polygon",
      fileName: "h3_transport_poverty_hotspot_score.geojson",
      style: { color: "#e11d48", opacity: 0.82 },
      thematicProperty: "TPHS",
      thematicClassProperty: "TPHS_class",
      palette: "orange",
    },
    {
      id: "analysis-data-confidence",
      name: "Data confidence",
      description:
        "Weighted source completeness, spatial resolution, temporal freshness and data directness score.",
      kind: "polygon",
      fileName: "h3_data_confidence_score.geojson",
      style: { color: "#0f766e", opacity: 0.82 },
      thematicProperty: "DCS",
      thematicClassProperty: "confidence_class",
      palette: "green",
    },
    {
      id: "analysis-typology",
      name: "Typology",
      description:
        "Rule-based explanation of why an H3 cell is critical or lower concern.",
      kind: "polygon",
      fileName: "h3_hotspot_typology.geojson",
      style: { color: "#7c3aed", opacity: 0.82 },
      thematicClassProperty: "typology",
      palette: "purple",
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
      id: "services-essential-services-accessibility",
      name: "Essential services accessibility",
      description:
        "Strict H3 essential services accessibility from health, school, job and grocery access components.",
      kind: "polygon",
      fileName: "h3_essential_services_accessibility.geojson",
      style: { color: "#10b981", opacity: 0.78 },
      thematicProperty: "ESA",
      palette: "green",
    },
    {
      id: "services-essential-service-deficit",
      name: "Essential services deficit",
      description:
        "Strict H3 essential services deficit computed from healthcare, school, job and grocery access.",
      kind: "polygon",
      fileName: "h3_essential_services_deficit.geojson",
      defaultVisible: true,
      style: { color: "#e11d48", opacity: 0.82 },
      thematicProperty: "ESD",
      palette: "red",
    },
    {
      id: "services-health-access",
      name: "Health access",
      description: "Strict H3 healthcare accessibility component.",
      kind: "polygon",
      fileName: "h3_health_access.geojson",
      style: { color: "#10b981", opacity: 0.74 },
      thematicProperty: "HealthAccess",
      palette: "green",
    },
    {
      id: "services-school-access",
      name: "School access",
      description: "Strict H3 school accessibility component.",
      kind: "polygon",
      fileName: "h3_school_access.geojson",
      style: { color: "#10b981", opacity: 0.74 },
      thematicProperty: "SchoolAccess",
      palette: "green",
    },
    {
      id: "services-job-access",
      name: "Job access",
      description: "Strict H3 employment-opportunity accessibility component.",
      kind: "polygon",
      fileName: "h3_job_access.geojson",
      style: { color: "#10b981", opacity: 0.74 },
      thematicProperty: "JobAccess",
      palette: "green",
    },
    {
      id: "services-grocery-access",
      name: "Grocery access",
      description: "Strict H3 grocery accessibility component.",
      kind: "polygon",
      fileName: "h3_grocery_access.geojson",
      style: { color: "#10b981", opacity: 0.74 },
      thematicProperty: "GroceryAccess",
      palette: "green",
    },
    {
      id: "services-points-all",
      name: "Services points",
      description: "Healthcare, pharmacy, school, official food retail and OSM grocery service points used by the essential services layers.",
      kind: "point",
      fileName: "milan_essential_services_points.geojson",
      style: { color: "#10b981", opacity: 0.9 },
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
  const boundaryDirectory = path.join(DATA_ROOT, "context");
  const boundaryFileName = "citta_metropolitana_milano_boundary.geojson";
  const boundaryFilePath = path.join(boundaryDirectory, boundaryFileName);

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
      id: "vulnerability-elderly",
      name: "Elderly vulnerability",
      description: "Strict H3 elderly-population vulnerability component.",
      sourceFileName: "h3_svi_elderly.geojson",
      thematicProperty: "Elderly",
      palette: "orange",
      style: { color: "#d95f02", opacity: 0.82 },
    },
    {
      id: "vulnerability-employment",
      name: "Employment vulnerability",
      description: "Strict H3 labour-fragility / non-employment vulnerability component.",
      sourceFileName: "h3_svi_labour.geojson",
      thematicProperty: "Labour",
      palette: "red",
      style: { color: "#c23b43", opacity: 0.82 },
    },
    {
      id: "vulnerability-education",
      name: "Education vulnerability",
      description: "Strict H3 low-education vulnerability component.",
      sourceFileName: "h3_svi_education.geojson",
      thematicProperty: "Education",
      palette: "purple",
      style: { color: "#6d4b9a", opacity: 0.82 },
    },
    {
      id: "vulnerability-citizenship",
      name: "Citizenship vulnerability",
      description: "Strict H3 extra-EU citizenship vulnerability component.",
      sourceFileName: "h3_svi_citizenship.geojson",
      thematicProperty: "Citizenship",
      palette: "blue",
      style: { color: "#2f6690", opacity: 0.82 },
    },
    {
      id: "vulnerability-income",
      name: "Income vulnerability",
      description: "Strict H3 low-income vulnerability component.",
      sourceFileName: "h3_svi_income.geojson",
      thematicProperty: "Income",
      palette: "brown",
      style: { color: "#8f5b33", opacity: 0.82 },
    },
    {
      id: "vulnerability-motorisation",
      name: "Motorisation",
      description: "Strict H3 motorisation component interpreted as private-mobility availability.",
      sourceFileName: "h3_svi_motorisation.geojson",
      thematicProperty: "Motorisation",
      palette: "green",
      style: { color: "#2d7f4f", opacity: 0.82 },
    },
    {
      id: "vulnerability-low-car-access",
      name: "Low car access",
      description: "Strict H3 low private-mobility access signal computed from income and motorisation.",
      sourceFileName: "h3_svi_low_car_access.geojson",
      thematicProperty: "LowCarAccess",
      palette: "teal",
      style: { color: "#0f766e", opacity: 0.82 },
    },
    {
      id: "vulnerability-car-dependency-stress",
      name: "Car dependency stress",
      description: "Strict H3 interpretation signal combining low income, motorisation and public transport deficit.",
      sourceFileName: "h3_car_dependency_stress.geojson",
      thematicProperty: "CarDependencyStress",
      palette: "pink",
      style: { color: "#ad3f7d", opacity: 0.82 },
    },
    {
      id: "vulnerability-index",
      name: "Social vulnerability index",
      description: "Strict composite Social Vulnerability Index from demographic, income and low-car-access signals.",
      sourceFileName: "h3_social_vulnerability_index.geojson",
      thematicProperty: "SVI",
      palette: "indigo",
      style: { color: "#4338ca", opacity: 0.88 },
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
      id: "earth-observation-territorial-disadvantage",
      name: "EO territorial disadvantage",
      description: "Strict EO-Territorial Disadvantage Index from isolation, settlement pressure, growth pressure and demand intensity.",
      kind: "polygon",
      fileName: "h3_eo_territorial_disadvantage.geojson",
      defaultVisible: true,
      style: { color: "#e11d48", opacity: 0.76 },
      thematicProperty: "EOTD",
      palette: "pink",
    },
    {
      id: "earth-observation-population-demand",
      name: "Population demand",
      description: "Strict H3 population-demand component used in EO territorial disadvantage.",
      kind: "polygon",
      fileName: "h3_population_demand.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "P",
      palette: "purple",
    },
    {
      id: "earth-observation-built-up-density",
      name: "Built-up density",
      description: "Strict H3 built-up density component.",
      kind: "polygon",
      fileName: "h3_built_up_density.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "B",
      palette: "purple",
    },
    {
      id: "earth-observation-artificial-land-cover",
      name: "Artificial land cover",
      description: "Strict H3 artificial land-cover share component.",
      kind: "polygon",
      fileName: "h3_artificial_land_cover.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "A",
      palette: "purple",
    },
    {
      id: "earth-observation-artificial-land-cover-100m",
      name: "Artificial land cover 100m",
      description: "Original 100 m artificial land-cover share surface for inspecting the source EO signal.",
      kind: "polygon",
      fileName: "eo_artificial_land_cover_100m.geojson",
      style: { color: "#8b5cf6", opacity: 0.68 },
      thematicProperty: "landcover_artificial_share",
      thematicClassProperty: "artificial_landcover_class",
      palette: "purple",
    },
    {
      id: "earth-observation-nighttime-lights",
      name: "Nighttime lights",
      description: "Strict H3 nighttime-lights component.",
      kind: "polygon",
      fileName: "h3_night_time_lights.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "L",
      palette: "purple",
    },
    {
      id: "earth-observation-nighttime-lights-100m",
      name: "Nighttime lights 100m",
      description: "Original 100 m SDGSAT-1 nighttime-lights surface for inspecting the source EO signal.",
      kind: "polygon",
      fileName: "eo_night_lights_sdgsat1_100m_fast.geojson",
      style: { color: "#8b5cf6", opacity: 0.68 },
      thematicProperty: "ntl_sdgsat1_lh_score",
      thematicClassProperty: "sdgsat1_night_lights_class",
      palette: "purple",
    },
    {
      id: "earth-observation-road-density",
      name: "Road density",
      description: "Strict H3 road-density component.",
      kind: "polygon",
      fileName: "h3_road_density.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "RoadDensity",
      palette: "purple",
    },
    {
      id: "earth-observation-intersection-density",
      name: "Intersection density",
      description: "Strict H3 intersection-density component.",
      kind: "polygon",
      fileName: "h3_intersection_density.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "IntersectionDensity",
      palette: "purple",
    },
    {
      id: "earth-observation-road-connectivity",
      name: "Road connectivity",
      description: "Strict H3 road-network connectivity component.",
      kind: "polygon",
      fileName: "h3_road_connectivity.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "R",
      palette: "purple",
    },
    {
      id: "earth-observation-green-land",
      name: "Green land",
      description: "Strict H3 green/open land-cover component.",
      kind: "polygon",
      fileName: "h3_green_open_land.geojson",
      style: { color: "#16a34a", opacity: 0.72 },
      thematicProperty: "G",
      palette: "green",
    },
    {
      id: "earth-observation-urban-growth",
      name: "Urban growth",
      description: "Strict H3 urban-growth pressure component.",
      kind: "polygon",
      fileName: "h3_urban_growth.geojson",
      style: { color: "#8b5cf6", opacity: 0.72 },
      thematicProperty: "U",
      palette: "purple",
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

  const displayFileName = fileName.replace(/\.geojson$/, ".display.geojson");
  const displayFilePath = path.join(outputDirectory, displayFileName);
  const displaySizePath = [
    displayFilePath,
    `${displayFilePath}.br`,
    `${displayFilePath}.gz`,
  ].find((candidate) => existsSync(candidate));

  return {
    filePath,
    sizeBytes: statSync(sizePath).size,
    ...(displaySizePath
      ? {
          displayFileName,
          displayFilePath,
          displaySizeBytes: statSync(displaySizePath).size,
        }
      : {}),
  };
}
