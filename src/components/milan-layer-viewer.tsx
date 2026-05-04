"use client";

import * as React from "react";
import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  MapLayerMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import {
  BrainCircuit,
  ChevronRight,
  CheckCircle2,
  DatabaseZap,
  FileText,
  HandHeart,
  Lightbulb,
  Satellite,
  SendHorizontal,
  TramFront,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Map as GeoMap, useMap } from "@/components/ui/map";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_LLM_SETTINGS,
  type LlmSettings,
} from "@/lib/llm-settings";
import { cn } from "@/lib/utils";
import type {
  LayerGroupId,
  MilanLayerGroup,
  PublicMilanLayer,
} from "@/lib/layer-registry";

type ThemeMode = "dark" | "light";
type PrimaryFunctionId =
  | "ptal"
  | "services"
  | "vulnerability"
  | "earth-observation"
  | "ai-agent";

type PrimaryFunction = {
  id: PrimaryFunctionId;
  groupId?: LayerGroupId;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type MilanLayerViewerProps = {
  groups: MilanLayerGroup[];
};

type IconProps = {
  className?: string;
};

type LayerMaterial = "default" | "grayscale" | "contrast" | "dark";
type BasemapId = "current" | "satellite" | "transport" | "osm";
type BasemapStyles = {
  light: string | StyleSpecification;
  dark: string | StyleSpecification;
};

type SelectedFeature = {
  layer: PublicMilanLayer;
  properties: GeoJSON.GeoJsonProperties;
  coordinate: [number, number];
};

type FeatureDetailMode = "overview" | "advanced";

type FeatureOverviewEntry = {
  key: string;
  label: string;
  value: string;
  color: string;
};

type AddressLookupState =
  | {
      coordinateKey: string | null;
      status: "idle" | "loading" | "error";
      address: null;
    }
  | {
      coordinateKey: string;
      status: "success";
      address: Record<string, string | undefined> | null;
    };

type ReverseGeocodeData = {
  address: Record<string, string | undefined> | null;
};

type AnalysisInterpretState =
  | { status: "idle"; answer: string | null; error: string | null }
  | { status: "loading"; answer: string | null; error: string | null }
  | { status: "success"; answer: string; error: string | null }
  | { status: "error"; answer: string | null; error: string };

type AnalysisInterpretResponse = {
  answer?: string;
  error?: string;
};

type AnalysisReportCard = {
  h3_id?: string;
  municipality?: string;
  municipality_name?: string;
  scores?: Record<string, number>;
  classes?: Record<string, string>;
  score_breakdown?: Record<string, number>;
  dominant_drivers?: string;
  typology?: string;
  typology_reason?: string;
  transit_dependency?: {
    diagnosis?: string | null;
    redundancy_score?: number | null;
    primary_route_line?: string | null;
    primary_route_mode?: string | null;
    primary_stop_id?: string | null;
    recommended_gtfs_action?: string | null;
  };
  suggested_intervention_family?: string;
  local_validation_needs?: string;
  possible_kpis?: string;
  caveats?: string[];
  report_ready_paragraph?: string;
  hotspot_score?: number;
  intervention_priority_score?: number;
  intervention_priority_formula_score?: number;
  data_confidence_score?: number;
  hotspot_class?: string;
  priority_class?: string;
  confidence_class?: string;
};

type AnalysisReportSummary = {
  title?: string;
  generated_at_utc?: string;
  h3_resolution?: number;
  h3_count?: number;
  hotspot_cluster_count?: number;
  high_priority_h3_count?: number;
  score_means?: Record<string, number>;
  priority_class_distribution?: Array<Record<string, string | number>>;
  hotspot_class_distribution?: Array<Record<string, string | number>>;
  confidence_class_distribution?: Array<Record<string, string | number>>;
  typology_distribution?: Array<Record<string, string | number>>;
  top_10_h3?: AnalysisReportCard[];
  caveats?: string[];
};

type AnalysisReportContext = {
  summary?: AnalysisReportSummary | null;
  selectedCard?: AnalysisReportCard | null;
  topCards?: AnalysisReportCard[];
  images?: {
    hotspot?: string;
    interventionPriority?: string;
  };
};

const GOOGLE_MAPS_EMBED_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;

const LLM_SETTINGS_STORAGE_KEY = "milan-gis-llm-settings";

const DEFAULT_VISIBLE_LAYER_IDS: Record<PrimaryFunctionId, string[]> = {
  ptal: ["ptal-public-transport-accessibility-level"],
  services: ["services-essential-service-points"],
  vulnerability: ["vulnerability-age"],
  "earth-observation": ["earth-observation-sdgsat1-night-lights"],
  "ai-agent": ["analysis-dashboard"],
};

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    {
      id: "esri-world-imagery",
      type: "raster",
      source: "esri-world-imagery",
    },
  ],
};

const BASEMAP_STYLES: Record<BasemapId, BasemapStyles> = {
  current: {
    light:
      "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
    dark:
      "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  satellite: {
    light: SATELLITE_STYLE,
    dark: SATELLITE_STYLE,
  },
  transport: {
    light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  osm: {
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/liberty",
  },
};

const BASEMAP_OPTIONS: Array<{
  id: BasemapId;
  label: string;
  preview: React.CSSProperties;
}> = [
  {
    id: "current",
    label: "Default",
    preview: {
      backgroundColor: "#f8fafc",
      backgroundImage:
        "linear-gradient(25deg, transparent 42%, #d4d4d8 43%, #d4d4d8 47%, transparent 48%), linear-gradient(150deg, transparent 38%, #cbd5e1 39%, #cbd5e1 43%, transparent 44%), radial-gradient(circle at 70% 28%, #e2e8f0 0 12%, transparent 13%)",
      backgroundSize: "100% 100%",
    },
  },
  {
    id: "satellite",
    label: "Satellite",
    preview: {
      backgroundColor: "#263326",
      backgroundImage:
        "radial-gradient(circle at 25% 35%, #6b7f47 0 18%, transparent 19%), radial-gradient(circle at 70% 45%, #405f3d 0 22%, transparent 23%), linear-gradient(135deg, #1f2a1f, #45533f)",
      backgroundSize: "100% 100%",
    },
  },
  {
    id: "transport",
    label: "Transport",
    preview: {
      backgroundColor: "#f8fafc",
      backgroundImage:
        "linear-gradient(30deg, transparent 40%, #fb7185 41%, #fb7185 45%, transparent 46%), linear-gradient(125deg, transparent 52%, #60a5fa 53%, #60a5fa 57%, transparent 58%), linear-gradient(0deg, transparent 64%, #d1d5db 65%, #d1d5db 68%, transparent 69%)",
      backgroundSize: "100% 100%",
    },
  },
  {
    id: "osm",
    label: "OSM",
    preview: {
      backgroundColor: "#eef2e6",
      backgroundImage:
        "linear-gradient(35deg, transparent 45%, #f59e0b 46%, #f59e0b 50%, transparent 51%), linear-gradient(115deg, transparent 48%, #94a3b8 49%, #94a3b8 52%, transparent 53%), radial-gradient(circle at 70% 30%, #bfdbfe 0 16%, transparent 17%)",
      backgroundSize: "100% 100%",
    },
  },
];

function LayerStackIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 3 8 4-8 4-8-4 8-4Z" strokeWidth="1.8" />
      <path d="m4 12 8 4 8-4" strokeWidth="1.8" />
      <path d="m4 17 8 4 8-4" strokeWidth="1.8" />
    </svg>
  );
}

function TransitAccessIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 17.5c3-7.5 8-8.5 14-6.5" strokeWidth="1.8" />
      <path d="M6 6h5.5c2.1 0 3.5 1.4 3.5 3.2V17" strokeWidth="1.8" />
      <circle cx="5" cy="17.5" r="2" strokeWidth="1.8" />
      <circle cx="15" cy="17" r="2" strokeWidth="1.8" />
      <circle cx="19" cy="11" r="2" strokeWidth="1.8" />
      <path d="M4 6h2" strokeWidth="1.8" />
    </svg>
  );
}

function ServicesIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 20V8l7-3 7 3v12" strokeWidth="1.8" />
      <path d="M8 20v-4h8v4" strokeWidth="1.8" />
      <path d="M9 10h2M13 10h2M9 13h2M13 13h2" strokeWidth="1.6" />
      <path d="M12 6.5v3M10.5 8h3" strokeWidth="1.6" />
    </svg>
  );
}

function VulnerabilityIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5 19 6v5.5c0 4-2.8 7.1-7 9-4.2-1.9-7-5-7-9V6l7-2.5Z" strokeWidth="1.8" />
      <path d="M8.5 13h7" strokeWidth="1.6" />
      <path d="M9.5 9.5h.01M14.5 9.5h.01M10 16h4" strokeWidth="2" />
    </svg>
  );
}

function EarthObservationIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      <path d="M4.5 12a7.5 7.5 0 0 1 7.5-7.5" strokeWidth="1.8" />
      <path d="M19.5 12a7.5 7.5 0 0 1-7.5 7.5" strokeWidth="1.8" />
      <path d="M7.4 18.3 5.6 20.1M18.4 3.9l-1.8 1.8" strokeWidth="1.8" />
      <path d="M16 8 20 4M4 20l4-4" strokeWidth="1.8" />
    </svg>
  );
}

function AgentWorkflowIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="8" width="12" height="10" rx="3" strokeWidth="1.8" />
      <path d="M9 8V5.8M15 8V5.8M8.5 13h.01M15.5 13h.01" strokeWidth="2" />
      <path d="M10 16h4M4 12h2M18 12h2" strokeWidth="1.8" />
    </svg>
  );
}

const PRIMARY_FUNCTIONS: PrimaryFunction[] = [
  {
    id: "ai-agent",
    groupId: "analysis",
    label: "Analysis",
    shortLabel: "AN",
    description: "TP-IPT decision analysis, hotspots and intervention priority.",
    accent: "#2563eb",
    icon: AgentWorkflowIcon,
  },
  {
    id: "vulnerability",
    groupId: "vulnerability",
    label: "Vulnerability",
    shortLabel: "VU",
    description: "Social vulnerability and transport poverty signals.",
    accent: "#fb923c",
    icon: VulnerabilityIcon,
  },
  {
    id: "ptal",
    groupId: "ptal",
    label: "Public Accessibility",
    shortLabel: "PA",
    description: "Public transport accessibility and NetEx coverage.",
    accent: "#60a5fa",
    icon: TransitAccessIcon,
  },
  {
    id: "services",
    groupId: "services",
    label: "Essential Services",
    shortLabel: "SV",
    description: "Essential service reach for daily urban access.",
    accent: "#34d399",
    icon: ServicesIcon,
  },
  {
    id: "earth-observation",
    groupId: "earth-observation",
    label: "Earth Observation",
    shortLabel: "EO",
    description: "Earth observation context and transport gap surfaces.",
    accent: "#c084fc",
    icon: EarthObservationIcon,
  },
];

const FOCUS_DATA: Record<PrimaryFunctionId, string[]> = {
  ptal: [
    "Public Transport Accessibility Level (PTAL)",
    "Public Transport Opportunity Level (PTOL)",
    "GTFS and NetEx stops",
    "Bus, metro, tram and rail stop layers",
  ],
  services: [
    "Essential service points",
    "Essential service accessibility",
    "Essential service gap",
    "Healthcare, education, grocery and jobs",
  ],
  vulnerability: [
    "age vulnerability",
    "employment vulnerability",
    "gender vulnerability",
    "education vulnerability",
    "citizenship vulnerability",
    "vulnerability index",
  ],
  "earth-observation": [
    "SDGSAT-1 night lights",
    "Artificial land-cover",
    "Green/open land-cover",
    "Built-up density",
    "Urban growth 2010-2020",
  ],
  "ai-agent": [
    "Dashboard",
    "Intervention priority",
    "Hotspot score",
    "Data confidence",
    "Typology",
    "GTFS/NeTEx dependency",
    "Critical transit stops",
  ],
};

const PTAL_CLASSES = [
  { value: "0", label: "0", color: "#f3f4f6" },
  { value: "1a", label: "1a", color: "#6f879e" },
  { value: "1b", label: "1b", color: "#4f9bbb" },
  { value: "2", label: "2", color: "#38a7c2" },
  { value: "3", label: "3", color: "#a7d36b" },
  { value: "4", label: "4", color: "#eadc38" },
  { value: "5", label: "5", color: "#e8ad70" },
  { value: "6a", label: "6a", color: "#d95f66" },
  { value: "6b", label: "6b", color: "#a45258" },
];

const PTOL_CLASSES = [
  { value: 0, label: "0", color: "#e5edf4" },
  { value: 1, label: "1", color: "#8bbfe0" },
  { value: 2, label: "2", color: "#3b91c9" },
  { value: 3, label: "3", color: "#1264a3" },
  { value: 4, label: "4", color: "#073b7a" },
];

const STOP_MODE_CLASSES = [
  { value: "bus", label: "Bus", color: "#f59e0b" },
  { value: "tram", label: "Tram", color: "#22c55e" },
  { value: "metro", label: "Metro", color: "#ef4444" },
  { value: "rail", label: "Rail", color: "#8b5cf6" },
];

const SERVICE_POINT_CLASSES = [
  { value: "healthcare", label: "Healthcare", color: "#ef4444" },
  { value: "education", label: "Education", color: "#3b82f6" },
  { value: "grocery", label: "Grocery", color: "#22c55e" },
  { value: "jobs", label: "Jobs", color: "#f59e0b" },
];

const SERVICE_ACCESSIBILITY_CLASSES = [
  { value: "very_low", label: "Very low", color: "#e8f3ee" },
  { value: "low", label: "Low", color: "#bde5c8" },
  { value: "medium", label: "Medium", color: "#74c69d" },
  { value: "high", label: "High", color: "#2d9f69" },
  { value: "very_high", label: "Very high", color: "#0f6b43" },
];

const SERVICE_GAP_CLASSES = [
  { value: "very_low", label: "Very low", color: "#fff7ed" },
  { value: "low", label: "Low", color: "#fed7aa" },
  { value: "medium", label: "Medium", color: "#fb923c" },
  { value: "high", label: "High", color: "#e11d48" },
  { value: "very_high", label: "Very high", color: "#881337" },
];

const ANALYSIS_SCORE_CLASSES = [
  { value: 0, label: "0", color: "#eef2ff" },
  { value: 25, label: "25", color: "#93c5fd" },
  { value: 50, label: "50", color: "#facc15" },
  { value: 75, label: "75", color: "#fb923c" },
  { value: 100, label: "100", color: "#b91c1c" },
];

const ANALYSIS_CONFIDENCE_CLASSES = [
  { value: 0, label: "0", color: "#f0fdfa" },
  { value: 25, label: "25", color: "#99f6e4" },
  { value: 50, label: "50", color: "#2dd4bf" },
  { value: 75, label: "75", color: "#0f766e" },
  { value: 100, label: "100", color: "#134e4a" },
];

const ANALYSIS_TYPOLOGY_CLASSES = [
  { value: "Dense underserved fringe", label: "Dense underserved fringe", color: "#b91c1c" },
  { value: "Dispersed rural fragility", label: "Dispersed rural fragility", color: "#a16207" },
  { value: "Growth-transport mismatch", label: "Growth-transport mismatch", color: "#c2410c" },
  { value: "Active but disconnected area", label: "Active disconnected", color: "#7c3aed" },
  { value: "Essential-services desert", label: "Service desert", color: "#db2777" },
  { value: "General transport poverty hotspot", label: "General hotspot", color: "#2563eb" },
  { value: "Lower concern", label: "Lower concern", color: "#cbd5e1" },
];

const ANALYSIS_DEPENDENCY_CLASSES = [
  { value: "No useful PT supply", label: "No useful PT supply", color: "#7f1d1d" },
  { value: "Frequency bottleneck", label: "Frequency bottleneck", color: "#dc2626" },
  { value: "Bus-only low redundancy", label: "Bus-only low redundancy", color: "#f97316" },
  { value: "Single low-frequency route dependency", label: "Single low-frequency route", color: "#f59e0b" },
  { value: "Limited route redundancy", label: "Limited route redundancy", color: "#eab308" },
  { value: "Moderate transit dependency", label: "Moderate dependency", color: "#38bdf8" },
  { value: "Multimodal supported", label: "Multimodal supported", color: "#22c55e" },
];

type ContinuousLegendConfig = {
  label: string;
  stops: Array<[number, string]>;
  max?: number;
};

const EO_CONTINUOUS_LEGENDS: Record<string, ContinuousLegendConfig> = {
  "earth-observation-sdgsat1-night-lights": {
    label: "Night lights score",
    stops: [
      [0, "#071124"],
      [0.2, "#123a5a"],
      [0.4, "#1f7784"],
      [0.6, "#5ab47b"],
      [0.8, "#d7cf65"],
      [1, "#fff3b0"],
    ],
  },
  "earth-observation-artificial-land-cover": {
    label: "Artificial share",
    stops: [
      [0, "#fff7ed"],
      [0.2, "#fed7aa"],
      [0.4, "#fdba74"],
      [0.6, "#fb923c"],
      [0.8, "#ea580c"],
      [1, "#7c2d12"],
    ],
  },
  "earth-observation-green-open-land-cover": {
    label: "Green/open share",
    stops: [
      [0, "#f7fee7"],
      [0.2, "#d9f99d"],
      [0.4, "#86efac"],
      [0.6, "#4ade80"],
      [0.8, "#16a34a"],
      [1, "#14532d"],
    ],
  },
  "earth-observation-built-up-density": {
    label: "Built-up score",
    stops: [
      [0, "#fff7ed"],
      [0.2, "#fed7aa"],
      [0.4, "#fb923c"],
      [0.6, "#ef4444"],
      [0.8, "#b91c1c"],
      [1, "#450a0a"],
    ],
  },
  "earth-observation-urban-growth-2010-2020": {
    label: "Urban growth score",
    stops: [
      [0, "#fff1f2"],
      [0.2, "#fecdd3"],
      [0.4, "#fb7185"],
      [0.6, "#e11d48"],
      [0.8, "#9f1239"],
      [1, "#4c0519"],
    ],
  },
};

const ANALYSIS_CONTINUOUS_LEGENDS: Record<string, ContinuousLegendConfig> = {
  "analysis-intervention-priority": {
    label: "Priority score",
    max: 100,
    stops: ANALYSIS_SCORE_CLASSES.map((item) => [item.value, item.color]),
  },
  "analysis-hotspot-score": {
    label: "Hotspot score",
    max: 100,
    stops: ANALYSIS_SCORE_CLASSES.map((item) => [item.value, item.color]),
  },
  "analysis-data-confidence": {
    label: "Confidence score",
    max: 100,
    stops: ANALYSIS_CONFIDENCE_CLASSES.map((item) => [item.value, item.color]),
  },
  "analysis-hotspot-clusters": {
    label: "Mean priority",
    max: 100,
    stops: ANALYSIS_SCORE_CLASSES.map((item) => [item.value, item.color]),
  },
};

const ANALYSIS_DASHBOARD_SUMMARY = {
  meanPriority: 55.7,
  meanHotspot: 55.1,
  meanConfidence: 87.3,
  highPriorityCells: 5970,
  hotspotClusters: 168,
  h3Cells: 15547,
  distribution: {
    low: 21.8,
    medium: 20.9,
    high: 57.3,
  },
  breakdown: [
    {
      key: "svi_score",
      label: "Social vulnerability",
      value: 36.1,
      color: "#f97316",
    },
    {
      key: "pt_deficit_score",
      label: "PTAL deficit",
      value: 65.5,
      color: "#2563eb",
    },
    {
      key: "essential_services_deficit_score",
      label: "Essential services deficit",
      value: 70.5,
      color: "#10b981",
    },
    {
      key: "eo_territorial_disadvantage_score",
      label: "EO territorial disadvantage",
      value: 33.3,
      color: "#8b5cf6",
    },
    {
      key: "data_confidence_score",
      label: "Data confidence",
      value: 87.3,
      color: "#0f766e",
    },
  ],
  scenarios: [
    { label: "Equity first", value: 55.3 },
    { label: "Service access first", value: 59.0 },
    { label: "Mobility network first", value: 59.8 },
    { label: "Growth mismatch", value: 52.9 },
  ],
};

const ANALYSIS_PRESET_QUESTIONS = [
  "Why is this area high priority?",
  "What intervention should come first?",
  "Which evidence should be validated?",
];

const PTAL_FILL_COLOR = [
  "match",
  ["get", "ptal"],
  ...PTAL_CLASSES.flatMap((item) => [item.value, item.color]),
  "#60a5fa",
] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];

const PTAL_GRAYSCALE_COLOR = [
  "match",
  ["get", "ptal"],
  "0",
  "#f8fafc",
  "1a",
  "#d4d4d8",
  "1b",
  "#b4b4bb",
  "2",
  "#96969f",
  "3",
  "#73737d",
  "4",
  "#55555f",
  "5",
  "#3f3f46",
  "6a",
  "#27272a",
  "6b",
  "#09090b",
  "#71717a",
] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];

const PTAL_CONTRAST_COLOR = [
  "match",
  ["get", "ptal"],
  "0",
  "#ffffff",
  "1a",
  "#2563eb",
  "1b",
  "#0891b2",
  "2",
  "#06b6d4",
  "3",
  "#22c55e",
  "4",
  "#fde047",
  "5",
  "#fb923c",
  "6a",
  "#ef4444",
  "6b",
  "#7f1d1d",
  "#2563eb",
] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];

const PTAL_DARK_COLOR = [
  "match",
  ["get", "ptal"],
  "0",
  "#111827",
  "1a",
  "#1f2937",
  "1b",
  "#374151",
  "2",
  "#475569",
  "3",
  "#64748b",
  "4",
  "#94a3b8",
  "5",
  "#cbd5e1",
  "6a",
  "#f8fafc",
  "6b",
  "#ffffff",
  "#475569",
] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];

function ptalFillColor(material: LayerMaterial) {
  if (material === "grayscale") return PTAL_GRAYSCALE_COLOR;
  if (material === "contrast") return PTAL_CONTRAST_COLOR;
  if (material === "dark") return PTAL_DARK_COLOR;
  return PTAL_FILL_COLOR;
}

const PTOL_FILL_COLOR = [
  "interpolate",
  ["linear"],
  ["to-number", ["get", "ptol"], 0],
  ...PTOL_CLASSES.flatMap((item) => [item.value, item.color]),
] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];

function ptolFillColor() {
  return PTOL_FILL_COLOR;
}

const STOP_MODE_COLOR = [
  "match",
  ["get", "dominant_mode"],
  ...STOP_MODE_CLASSES.flatMap((item) => [item.value, item.color]),
  "#64748b",
] as unknown as NonNullable<
  CircleLayerSpecification["paint"]
>["circle-color"];

type CircleColorPaint = NonNullable<
  CircleLayerSpecification["paint"]
>["circle-color"];

function stopModeColor(
  layer: PublicMilanLayer,
  fallbackColor: CircleColorPaint,
) {
  return layer.id === "ptal-stops-all" ? STOP_MODE_COLOR : fallbackColor;
}

const SERVICE_POINT_COLOR = [
  "match",
  ["get", "service_theme"],
  ...SERVICE_POINT_CLASSES.flatMap((item) => [item.value, item.color]),
  "#64748b",
] as unknown as NonNullable<
  CircleLayerSpecification["paint"]
>["circle-color"];

function servicePointColor(
  layer: PublicMilanLayer,
  fallbackColor: CircleColorPaint,
) {
  return layer.id === "services-essential-service-points"
    ? SERVICE_POINT_COLOR
    : fallbackColor;
}

function serviceClassColor(layer: PublicMilanLayer) {
  const classes =
    layer.thematicClassProperty === "priority_gap_class" ||
    layer.thematicClassProperty === "gap_display_class"
      ? SERVICE_GAP_CLASSES
      : layer.thematicClassProperty === "accessibility_class"
        ? SERVICE_ACCESSIBILITY_CLASSES
        : null;

  if (!classes) return null;

  return [
    "match",
    ["to-string", ["get", layer.thematicClassProperty]],
    ...classes.flatMap((item) => [item.value, item.color]),
    VULNERABILITY_NO_DATA_COLOR,
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
}

function serviceFillOpacity(
  layer: PublicMilanLayer,
  effectiveOpacity: number,
) {
  if (
    layer.thematicClassProperty !== "accessibility_class" &&
    layer.thematicClassProperty !== "priority_gap_class" &&
    layer.thematicClassProperty !== "gap_display_class"
  ) {
    return effectiveOpacity;
  }

  const noDataOpacity = Math.min(effectiveOpacity, 0.16);

  return [
    "match",
    ["to-string", ["get", layer.thematicClassProperty]],
    "no_data",
    noDataOpacity,
    "missing",
    noDataOpacity,
    effectiveOpacity,
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-opacity"];
}

function analysisContinuousLegend(layer: PublicMilanLayer) {
  return ANALYSIS_CONTINUOUS_LEGENDS[layer.id] ?? null;
}

function analysisCategoryClasses(layer: PublicMilanLayer) {
  if (
    layer.id === "analysis-typology" ||
    layer.id === "analysis-hotspot-clusters"
  ) {
    return ANALYSIS_TYPOLOGY_CLASSES;
  }

  if (layer.id === "analysis-transit-dependency") {
    return ANALYSIS_DEPENDENCY_CLASSES;
  }

  return null;
}

function analysisLayerColor(layer: PublicMilanLayer) {
  const continuousLegend = analysisContinuousLegend(layer);

  if (continuousLegend && layer.thematicProperty) {
    return [
      "case",
      ["<", ["to-number", ["get", layer.thematicProperty], -1], 0],
      VULNERABILITY_NO_DATA_COLOR,
      [
        "interpolate",
        ["linear"],
        ["to-number", ["get", layer.thematicProperty], 0],
        ...continuousLegend.stops.flatMap(([value, color]) => [value, color]),
      ],
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
  }

  const classes = analysisCategoryClasses(layer);
  if (classes && layer.thematicClassProperty) {
    return [
      "match",
      ["to-string", ["get", layer.thematicClassProperty]],
      ...classes.flatMap((item) => [item.value, item.color]),
      VULNERABILITY_NO_DATA_COLOR,
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
  }

  return null;
}

function analysisFillOpacity(layer: PublicMilanLayer, effectiveOpacity: number) {
  if (layer.id === "analysis-hotspot-clusters") {
    return Math.min(effectiveOpacity + 0.08, 0.86);
  }

  return effectiveOpacity;
}

const ANALYSIS_STOP_MODE_COLOR = [
  "match",
  ["get", "dominant_mode"],
  ...STOP_MODE_CLASSES.flatMap((item) => [item.value, item.color]),
  "#64748b",
] as unknown as NonNullable<
  CircleLayerSpecification["paint"]
>["circle-color"];

function analysisPointColor(
  layer: PublicMilanLayer,
  fallbackColor: CircleColorPaint,
) {
  return layer.id === "analysis-critical-transit-stops"
    ? ANALYSIS_STOP_MODE_COLOR
    : fallbackColor;
}

function earthObservationLegend(layer: PublicMilanLayer) {
  return EO_CONTINUOUS_LEGENDS[layer.id] ?? null;
}

function earthObservationClassColor(layer: PublicMilanLayer) {
  const legend = earthObservationLegend(layer);
  if (!legend || !layer.thematicProperty) return null;

  return [
    "case",
    ["<", ["to-number", ["get", layer.thematicProperty], -1], 0],
    VULNERABILITY_NO_DATA_COLOR,
    [
      "interpolate",
      ["linear"],
      ["to-number", ["get", layer.thematicProperty], 0],
      ...legend.stops.flatMap(([value, color]) => [value, color]),
    ],
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
}

function earthObservationFillOpacity(
  layer: PublicMilanLayer,
  effectiveOpacity: number,
) {
  if (!layer.thematicClassProperty) return effectiveOpacity;

  const noDataOpacity = Math.min(effectiveOpacity, 0.16);

  return [
    "match",
    ["to-string", ["get", layer.thematicClassProperty]],
    "no_data",
    noDataOpacity,
    "missing",
    noDataOpacity,
    effectiveOpacity,
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-opacity"];
}

function interpolateHexColor(
  stops: ContinuousLegendConfig["stops"],
  value: number,
  max = 1,
) {
  const bounded = Math.max(0, Math.min(max, value));
  const upperIndex = stops.findIndex(([stop]) => stop >= bounded);
  if (upperIndex <= 0) return stops[0]?.[1] ?? "#64748b";

  const [upperStop, upperColor] = stops[upperIndex];
  const [lowerStop, lowerColor] = stops[upperIndex - 1];
  const span = upperStop - lowerStop || 1;
  const t = (bounded - lowerStop) / span;
  const lower = hexToRgb(lowerColor);
  const upper = hexToRgb(upperColor);

  return `rgb(${Math.round(lower.r + (upper.r - lower.r) * t)}, ${Math.round(
    lower.g + (upper.g - lower.g) * t,
  )}, ${Math.round(lower.b + (upper.b - lower.b) * t)})`;
}

function hexToRgb(color: string) {
  const normalized = color.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

const VULNERABILITY_PALETTES = {
  green: ["#e7f4e4", "#8bcf9b", "#2d7f4f"],
  blue: ["#eaf3f8", "#9fc7df", "#2f6690"],
  red: ["#fee8e6", "#f39a91", "#c23b43"],
  purple: ["#f0e9f6", "#b493d6", "#6d4b9a"],
  pink: ["#f9e3ef", "#d98aba", "#ad3f7d"],
  brown: ["#f5eadf", "#d1a070", "#8f5b33"],
  orange: ["#fff0d9", "#f7b267", "#d95f02"],
};

const VULNERABILITY_GRAYSCALE = ["#f4f4f5", "#a1a1aa", "#3f3f46"];
const VULNERABILITY_DARK = ["#27272a", "#71717a", "#f4f4f5"];
const VULNERABILITY_NO_DATA_COLOR = "#d9d9d9";

const VULNERABILITY_FIGURE_COPY: Record<
  string,
  { title: string; subtitle: string; note: string }
> = {
  "vulnerability-age": {
    title: "Age vulnerability",
    subtitle: "Residents aged 65+ (2023, H3 res9)",
    note: "Data-derived terciles from ISTAT 2023 section variables joined to H3 res9 cells",
  },
  "vulnerability-employment": {
    title: "Employment vulnerability",
    subtitle: "Non-employed residents aged 15-64 (2023, H3 res9)",
    note: "Data-derived terciles from ISTAT 2023 section variables joined to H3 res9 cells",
  },
  "vulnerability-gender": {
    title: "Gender vulnerability",
    subtitle: "Women residents (2023, H3 res9)",
    note: "Data-derived terciles from ISTAT 2023 section variables joined to H3 res9 cells",
  },
  "vulnerability-education": {
    title: "Education vulnerability",
    subtitle: "Low education proxy (2023, H3 res9)",
    note: "Data-derived terciles from ISTAT 2023 section variables joined to H3 res9 cells",
  },
  "vulnerability-citizenship": {
    title: "Citizenship vulnerability",
    subtitle: "Extra-EU citizens (2023, H3 res9)",
    note: "Data-derived terciles from ISTAT 2023 section variables joined to H3 res9 cells",
  },
  "vulnerability-index": {
    title: "Vulnerability index",
    subtitle: "Composite social vulnerability (2023, H3 res9)",
    note: "Low, medium and high classes from the composite vulnerability index",
  },
};

function vulnerabilityFigureCopy(layer: PublicMilanLayer) {
  return (
    VULNERABILITY_FIGURE_COPY[layer.id] ?? {
      title: layer.name,
      subtitle: "2023, 100 m grid",
      note: "Data-derived classes joined to 100 m grid",
    }
  );
}

function vulnerabilityNoDataExpression(rankProperty?: string | null) {
  const conditions: unknown[] = [
    ["==", ["to-string", ["get", "vulnerability_class"]], "no_data"],
  ];

  if (rankProperty) {
    conditions.push(["<", ["to-number", ["get", rankProperty], -1], 0]);
  }

  return ["any", ...conditions];
}

function vulnerabilityFillColor(
  layer: PublicMilanLayer,
  material: LayerMaterial,
) {
  const palette =
    material === "grayscale"
      ? VULNERABILITY_GRAYSCALE
      : material === "dark"
        ? VULNERABILITY_DARK
      : VULNERABILITY_PALETTES[layer.palette ?? "orange"];

  if (layer.thematicClassProperty) {
    return [
      "case",
      vulnerabilityNoDataExpression(),
      VULNERABILITY_NO_DATA_COLOR,
      [
        "match",
        ["to-string", ["get", layer.thematicClassProperty]],
        "0",
        palette[0],
        "low",
        palette[0],
        "1",
        palette[1],
        "medium",
        palette[1],
        "2",
        palette[2],
        "high",
        palette[2],
        VULNERABILITY_NO_DATA_COLOR,
      ],
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
  }

  const rankProperty =
    layer.thematicRankProperty ??
    (layer.thematicProperty ? `${layer.thematicProperty}_pct_rank` : null);
  if (!rankProperty) return null;

  const rankExpression = ["to-number", ["get", rankProperty], -1];

  return [
    "case",
    vulnerabilityNoDataExpression(rankProperty),
    VULNERABILITY_NO_DATA_COLOR,
    ["<", rankExpression, 1 / 3],
    palette[0],
    ["<", rankExpression, 2 / 3],
    palette[1],
    palette[2],
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
}

function vulnerabilityFillOpacity(
  layer: PublicMilanLayer,
  effectiveOpacity: number,
) {
  const noDataOpacity = Math.min(effectiveOpacity, 0.16);

  if (layer.thematicClassProperty) {
    return [
      "case",
      vulnerabilityNoDataExpression(),
      noDataOpacity,
      effectiveOpacity,
    ] as unknown as NonNullable<
      FillLayerSpecification["paint"]
    >["fill-opacity"];
  }

  const rankProperty =
    layer.thematicRankProperty ??
    (layer.thematicProperty ? `${layer.thematicProperty}_pct_rank` : null);
  if (!rankProperty) return effectiveOpacity;

  return [
    "case",
    vulnerabilityNoDataExpression(rankProperty),
    noDataOpacity,
    effectiveOpacity,
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-opacity"];
}

function layerMaterialColor(layer: PublicMilanLayer, material: LayerMaterial) {
  if (material === "grayscale") return "#71717a";
  if (material === "dark") return "#18181b";
  if (material === "contrast") return layer.style.color;
  return layer.style.color;
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  accessible_operators: "Operators",
  accessible_saps: "Access points",
  accessible_services: "Services",
  ai: "Accessibility index",
  bus: "Bus access",
  catchment_m: "Catchment",
  children_0_14_share: "Children 0-14",
  children_0_14_share_pct_rank: "Children rank",
  elderly_65_plus_share: "Elderly 65+",
  elderly_65_plus_share_pct_rank: "Elderly rank",
  i: "Grid ID",
  grid_id: "Grid ID",
  h3_id: "H3 cell",
  sampled_100m_cells: "Sampled cells",
  mean_section_population: "Mean population",
  m: "Municipality",
  COMUNE: "Municipality",
  n: "No data",
  v: "Value",
  c: "Class",
  extra_eu_share: "Extra-EU citizens",
  extra_eu_share_pct_rank: "Extra-EU rank",
  female_share: "Women",
  female_share_pct_rank: "Women rank",
  freq_per_hour: "Frequency/hour",
  line: "Line",
  line_count: "Line count",
  lines: "Lines",
  low_education_share: "Low education",
  low_education_share_pct_rank: "Education rank",
  max_line_freq_per_hour: "Max line frequency/hour",
  mean_wait_min: "Wait time",
  mean_walk_min: "Walk time",
  mode: "Mode",
  modes: "Modes",
  nearest_pt_stop_walk_min: "Nearest PT stop walk",
  not_employed_15_64_share: "Non-employed 15-64",
  not_employed_15_64_share_pct_rank: "Employment rank",
  operator: "Operator",
  operators: "Operators",
  ptal: "PTAL value",
  ptol: "PTOL value",
  ptol_mean: "PTOL mean",
  ptol_modes: "PTOL modes",
  vulnerability_index: "Vulnerability index",
  vulnerability_index_filled: "Vulnerability index",
  vulnerability_class: "Vulnerability class",
  scenario: "Scenario",
  service_count: "Service count",
  service_record_count: "Service records",
  sources: "Sources",
  stop_id: "Stop ID",
  stop_name: "Stop",
  dominant_mode: "Dominant mode",
  top_operator: "Top operator",
  total_freq_per_hour: "Total frequency/hour",
  tram: "Tram access",
  metro: "Metro access",
  rail: "Rail access",
  bus_access: "Bus access",
  tram_access: "Tram access",
  metro_access: "Metro access",
  rail_access: "Rail access",
  service_theme: "Theme",
  service_type: "Service type",
  service_type_label_en: "Service type",
  service_type_label_cn: "Service type",
  name: "Name",
  address: "Address",
  municipality: "Municipality",
  source_dataset: "Source",
  essential_services_accessibility_index: "Accessibility index",
  essential_services_vulnerability_gap: "Service gap",
  accessibility_class: "Accessibility class",
  priority_gap_class: "Gap priority",
  gap_display_class: "Gap priority",
  healthcare_structure_score: "Healthcare structure",
  pharmacy_score: "Pharmacy",
  healthcare_score: "Healthcare score",
  school_score: "School score",
  official_food_retail_score: "Official grocery",
  osm_grocery_score: "OSM grocery",
  grocery_score: "Grocery score",
  jobs_score: "Jobs score",
  nearest_healthcare_structure_m: "Healthcare distance",
  nearest_pharmacy_m: "Pharmacy distance",
  nearest_school_m: "School distance",
  nearest_official_food_retail_m: "Official grocery distance",
  nearest_osm_grocery_m: "OSM grocery distance",
  employees: "Employees",
  employees_per_km2: "Employees/km2",
  employees_per_1000_residents: "Employees/1000 residents",
  svi_score: "SVI score",
  pt_deficit_score: "PT deficit",
  essential_services_deficit_score: "Service deficit",
  eo_territorial_disadvantage_score: "EO disadvantage",
  hotspot_score: "Hotspot score",
  hotspot_class: "Hotspot class",
  intervention_priority_score: "Priority score",
  intervention_priority_formula_score: "Formula score",
  priority_class: "Priority class",
  data_confidence_score: "Data confidence",
  confidence_class: "Confidence class",
  typology: "Typology",
  typology_reason: "Typology reason",
  dominant_drivers: "Dominant drivers",
  suggested_intervention_family: "Suggested intervention",
  local_validation_needs: "Validation needs",
  possible_kpis: "Possible KPIs",
  ai_summary: "AI summary",
  transit_dependency_diagnosis: "Transit diagnosis",
  recommended_gtfs_action: "GTFS action",
  ai_transit_dependency_summary: "Transit summary",
  transport_access_score_mean: "PT deficit",
  route_count: "Routes",
  stop_count: "Stops",
  operator_count: "Operators",
  mode_count: "Modes",
  route_dependency_hhi: "Route dependency HHI",
  transit_dependency_redundancy_score: "Redundancy score",
  primary_route_id: "Primary route ID",
  primary_route_line: "Primary route",
  primary_route_mode: "Primary mode",
  primary_route_operator: "Primary operator",
  primary_route_dependency_share: "Route dependency share",
  primary_stop_id: "Primary stop",
  primary_stop_dependency_share: "Stop dependency share",
  cluster_id: "Cluster ID",
  h3_count: "H3 cells",
  priority_score_mean: "Mean priority",
  priority_score_max: "Max priority",
  hotspot_score_mean: "Mean hotspot",
  dominant_municipality: "Municipality",
  dependency_priority_score: "Dependency priority",
  dependent_h3_count: "Dependent H3 cells",
  dependent_grid_count: "Dependent grid cells",
  dependency_weight: "Dependency weight",
  mean_dependency_share: "Mean dependency share",
  route_lines: "Route lines",
  night_lights_sdgsat1_lh_mean_2022_2023: "Night lights mean",
  ntl_sdgsat1_lh_score: "Night lights score",
  sdgsat1_night_lights_class: "Night lights class",
  landcover_artificial_share: "Artificial share",
  artificial_landcover_class: "Artificial class",
  landcover_green_open_share: "Green/open share",
  green_open_landcover_class: "Green/open class",
  built_surface_m2_2020: "Built surface 2020",
  built_up_fraction_2020: "Built-up fraction",
  built_up_score: "Built-up score",
  built_up_density_class: "Built-up class",
  built_up_change_m2_2010_2020: "Built-up change",
  built_up_growth_share_2010_2020: "Growth share",
  urban_growth_score_2010_2020: "Urban growth score",
  urban_growth_2010_2020_class: "Urban growth class",
};

const ATTRIBUTE_PRIORITY = [
  "m",
  "v",
  "c",
  "n",
  "i",
  "h3_id",
  "ptal",
  "ptol",
  "ptol_mean",
  "ai",
  "stop_name",
  "dominant_mode",
  "modes",
  "lines",
  "total_freq_per_hour",
  "line_count",
  "service_count",
  "accessible_services",
  "accessible_saps",
  "accessible_operators",
  "nearest_pt_stop_walk_min",
  "ptol_modes",
  "vulnerability_index",
  "children_0_14_share",
  "elderly_65_plus_share",
  "not_employed_15_64_share",
  "female_share",
  "low_education_share",
  "extra_eu_share",
  "mean_wait_min",
  "mean_walk_min",
  "scenario",
  "line",
  "mode",
  "operator",
  "operators",
  "freq_per_hour",
  "catchment_m",
  "top_operator",
  "bus",
  "tram",
  "metro",
  "rail",
  "bus_access",
  "tram_access",
  "metro_access",
  "rail_access",
  "service_theme",
  "service_type_label_en",
  "name",
  "address",
  "municipality",
  "source_dataset",
  "essential_services_accessibility_index",
  "essential_services_vulnerability_gap",
  "accessibility_class",
  "gap_display_class",
  "priority_gap_class",
  "healthcare_score",
  "school_score",
  "grocery_score",
  "jobs_score",
  "nearest_healthcare_structure_m",
  "nearest_pharmacy_m",
  "nearest_school_m",
  "nearest_official_food_retail_m",
  "nearest_osm_grocery_m",
];

const LAYER_OVERVIEW_ATTRIBUTE_PRIORITY: Record<string, string[]> = {
  "analysis-intervention-priority": [
    "intervention_priority_score",
    "hotspot_score",
    "data_confidence_score",
    "typology",
    "dominant_drivers",
    "transit_dependency_diagnosis",
    "suggested_intervention_family",
  ],
  "analysis-hotspot-score": [
    "hotspot_score",
    "priority_class",
    "svi_score",
    "pt_deficit_score",
    "essential_services_deficit_score",
    "eo_territorial_disadvantage_score",
    "dominant_drivers",
  ],
  "analysis-data-confidence": [
    "data_confidence_score",
    "confidence_class",
    "source_completeness_score",
    "spatial_resolution_score",
    "temporal_freshness_score",
    "data_directness_score",
  ],
  "analysis-typology": [
    "typology",
    "typology_reason",
    "dominant_drivers",
    "suggested_intervention_family",
    "local_validation_needs",
    "possible_kpis",
  ],
  "analysis-transit-dependency": [
    "transit_dependency_diagnosis",
    "recommended_gtfs_action",
    "transport_access_score_mean",
    "route_count",
    "stop_count",
    "primary_route_line",
    "primary_stop_id",
  ],
  "analysis-hotspot-clusters": [
    "cluster_id",
    "h3_count",
    "priority_score_mean",
    "priority_score_max",
    "hotspot_score_mean",
    "typology",
    "dominant_municipality",
  ],
  "analysis-critical-transit-stops": [
    "stop_name",
    "dominant_mode",
    "lines",
    "dependency_priority_score",
    "dependent_h3_count",
    "dependent_grid_count",
    "mean_dependency_share",
  ],
  "ptal-public-transport-accessibility-level": [
    "ptal",
    "ai",
    "mean_walk_min",
    "mean_wait_min",
    "accessible_services",
    "accessible_saps",
    "top_operator",
  ],
  "ptal-public-transport-opportunity-level": [
    "ptol",
    "ptol_mean",
    "nearest_pt_stop_walk_min",
    "ptol_modes",
    "bus_access",
    "tram_access",
    "metro_access",
    "rail_access",
  ],
  "ptal-stops-all": [
    "stop_name",
    "dominant_mode",
    "modes",
    "lines",
    "total_freq_per_hour",
    "line_count",
    "service_count",
    "operators",
  ],
  "services-essential-service-points": [
    "name",
    "service_theme",
    "service_type_label_en",
    "municipality",
    "source_dataset",
    "address",
  ],
  "services-essential-service-accessibility": [
    "essential_services_accessibility_index",
    "accessibility_class",
    "healthcare_score",
    "school_score",
    "grocery_score",
    "jobs_score",
  ],
  "services-essential-service-gap": [
    "essential_services_vulnerability_gap",
    "gap_display_class",
    "priority_gap_class",
    "vulnerability_index_filled",
    "accessibility_class",
    "sampled_100m_cells",
    "COMUNE",
  ],
  "vulnerability-age": [
    "elderly_65_plus_share",
    "elderly_65_plus_share_pct_rank",
    "vulnerability_index_filled",
    "vulnerability_class",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "vulnerability-employment": [
    "not_employed_15_64_share",
    "not_employed_15_64_share_pct_rank",
    "vulnerability_index_filled",
    "vulnerability_class",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "vulnerability-gender": [
    "female_share",
    "female_share_pct_rank",
    "vulnerability_index_filled",
    "vulnerability_class",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "vulnerability-education": [
    "low_education_share",
    "low_education_share_pct_rank",
    "vulnerability_index_filled",
    "vulnerability_class",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "vulnerability-citizenship": [
    "extra_eu_share",
    "extra_eu_share_pct_rank",
    "vulnerability_index_filled",
    "vulnerability_class",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "vulnerability-index": [
    "vulnerability_index_filled",
    "vulnerability_class",
    "vulnerability_index",
    "sampled_100m_cells",
    "mean_section_population",
  ],
  "earth-observation-sdgsat1-night-lights": [
    "sdgsat1_night_lights_class",
    "ntl_sdgsat1_lh_score",
    "night_lights_sdgsat1_lh_mean_2022_2023",
    "grid_id",
  ],
  "earth-observation-artificial-land-cover": [
    "artificial_landcover_class",
    "landcover_artificial_share",
    "grid_id",
  ],
  "earth-observation-green-open-land-cover": [
    "green_open_landcover_class",
    "landcover_green_open_share",
    "grid_id",
  ],
  "earth-observation-built-up-density": [
    "built_up_density_class",
    "built_up_score",
    "built_up_fraction_2020",
    "built_surface_m2_2020",
    "grid_id",
  ],
  "earth-observation-urban-growth-2010-2020": [
    "urban_growth_2010_2020_class",
    "urban_growth_score_2010_2020",
    "built_up_growth_share_2010_2020",
    "built_up_change_m2_2010_2020",
    "grid_id",
  ],
};

const GROUP_OVERVIEW_ATTRIBUTE_PRIORITY: Partial<Record<LayerGroupId, string[]>> =
  {
    analysis: [
      "intervention_priority_score",
      "hotspot_score",
      "data_confidence_score",
      "typology",
      "dominant_drivers",
      "transit_dependency_diagnosis",
    ],
    ptal: ["ptal", "ptol", "ai", "dominant_mode", "modes", "lines"],
    services: [
      "service_theme",
      "service_type_label_en",
      "essential_services_accessibility_index",
      "essential_services_vulnerability_gap",
      "accessibility_class",
      "gap_display_class",
      "priority_gap_class",
    ],
    vulnerability: ["v", "c", "n", "m"],
    "earth-observation": [
      "grid_id",
      "ntl_sdgsat1_lh_score",
      "landcover_artificial_share",
      "landcover_green_open_share",
      "built_up_score",
      "urban_growth_score_2010_2020",
    ],
    context: ["m", "v", "c", "n"],
  };

function geometryFilter(kind: "Point" | "LineString" | "Polygon") {
  return ["==", ["geometry-type"], kind] as FilterSpecification;
}

function formatAttributeValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return String(value);
}

const EO_CLASS_ATTRIBUTE_KEYS = new Set([
  "sdgsat1_night_lights_class",
  "artificial_landcover_class",
  "green_open_landcover_class",
  "built_up_density_class",
  "urban_growth_2010_2020_class",
]);

const EO_PERCENT_ATTRIBUTE_KEYS = new Set([
  "ntl_sdgsat1_lh_score",
  "landcover_artificial_share",
  "landcover_green_open_share",
  "built_up_fraction_2020",
  "built_up_score",
  "built_up_growth_share_2010_2020",
  "urban_growth_score_2010_2020",
]);

function formatFeatureAttribute(key: string, value: unknown) {
  if (
    key === "service_theme" ||
    key === "accessibility_class" ||
    key === "gap_display_class" ||
    key === "priority_gap_class" ||
    key === "vulnerability_class" ||
    key === "priority_class" ||
    key === "hotspot_class" ||
    key === "confidence_class" ||
    key === "transit_dependency_diagnosis" ||
    EO_CLASS_ATTRIBUTE_KEYS.has(key)
  ) {
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (typeof value === "number" && EO_PERCENT_ATTRIBUTE_KEYS.has(key)) {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (key === "c") {
    if (value === 0) return "Low";
    if (value === 1) return "Medium";
    if (value === 2) return "High";
    return "No data";
  }

  if (key === "n") {
    return value === 1 ? "Yes" : "No";
  }

  return formatAttributeValue(value);
}

function featureItemEntries(
  properties: GeoJSON.GeoJsonProperties,
  limit = 8,
) {
  const source = properties ?? {};
  const priorityEntries = ATTRIBUTE_PRIORITY.flatMap((key) => {
    const value = source[key];
    if (value === null || value === undefined || value === "") return [];
    return [
      [ATTRIBUTE_LABELS[key] ?? key, formatFeatureAttribute(key, value)] as const,
    ];
  });
  const seenLabels = new Set(priorityEntries.map(([label]) => label));
  const fallbackEntries = Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [
      ATTRIBUTE_LABELS[key] ?? key,
      formatFeatureAttribute(key, value),
    ] as const)
    .filter(([label]) => !seenLabels.has(label));

  return [...priorityEntries, ...fallbackEntries].slice(0, limit);
}

function featurePrimaryColor(feature: SelectedFeature) {
  const source = feature.properties ?? {};

  if (feature.layer.id === "ptal-public-transport-accessibility-level") {
    const ptal = source.ptal;
    return (
      PTAL_CLASSES.find((item) => item.value === String(ptal))?.color ??
      feature.layer.style.color
    );
  }

  if (feature.layer.id === "ptal-public-transport-opportunity-level") {
    const ptol = Number(source.ptol ?? source.ptol_mean);
    if (Number.isFinite(ptol)) {
      const value = Math.max(0, Math.min(4, Math.round(ptol)));
      return (
        PTOL_CLASSES.find((item) => item.value === value)?.color ??
        feature.layer.style.color
      );
    }
  }

  if (feature.layer.id === "ptal-stops-all") {
    const mode = String(source.dominant_mode ?? source.mode ?? source.modes ?? "")
      .toLowerCase()
      .split(/[,;/\s]+/)[0];
    return (
      STOP_MODE_CLASSES.find((item) => item.value === mode)?.color ??
      feature.layer.style.color
    );
  }

  if (feature.layer.id === "services-essential-service-points") {
    const theme = String(source.service_theme ?? "").toLowerCase();
    return (
      SERVICE_POINT_CLASSES.find((item) => item.value === theme)?.color ??
      feature.layer.style.color
    );
  }

  if (feature.layer.id === "services-essential-service-accessibility") {
    const classValue = String(source.accessibility_class ?? "").toLowerCase();
    return (
      SERVICE_ACCESSIBILITY_CLASSES.find((item) => item.value === classValue)
        ?.color ?? feature.layer.style.color
    );
  }

  if (feature.layer.id === "services-essential-service-gap") {
    const classValue = String(
      source.gap_display_class ?? source.priority_gap_class ?? "",
    ).toLowerCase();
    return (
      SERVICE_GAP_CLASSES.find((item) => item.value === classValue)?.color ??
      (classValue === "no_data"
        ? VULNERABILITY_NO_DATA_COLOR
        : feature.layer.style.color)
    );
  }

  if (feature.layer.group === "analysis") {
    const continuousLegend = analysisContinuousLegend(feature.layer);
    const value = feature.layer.thematicProperty
      ? Number(source[feature.layer.thematicProperty])
      : Number.NaN;

    if (continuousLegend && Number.isFinite(value)) {
      return interpolateHexColor(
        continuousLegend.stops,
        value,
        continuousLegend.max,
      );
    }

    const classProperty = feature.layer.thematicClassProperty;
    const classValue = classProperty ? String(source[classProperty] ?? "") : "";

    return (
      analysisCategoryClasses(feature.layer)?.find(
        (item) => item.value === classValue,
      )?.color ?? feature.layer.style.color
    );
  }

  if (feature.layer.group === "earth-observation") {
    const legend = earthObservationLegend(feature.layer);
    const value = feature.layer.thematicProperty
      ? Number(source[feature.layer.thematicProperty])
      : Number.NaN;

    if (legend && Number.isFinite(value)) {
      return interpolateHexColor(legend.stops, value);
    }

    return feature.layer.style.color;
  }

  if (feature.layer.group === "vulnerability") {
    const rawClass = source[feature.layer.thematicClassProperty ?? "c"];
    const palette = VULNERABILITY_PALETTES[feature.layer.palette ?? "orange"];
    const classValue = String(rawClass).toLowerCase();
    if (classValue === "0" || classValue === "low") return palette[0];
    if (classValue === "1" || classValue === "medium") return palette[1];
    if (classValue === "2" || classValue === "high") return palette[2];
    if (source.n === 1 || classValue === "-1") return VULNERABILITY_NO_DATA_COLOR;

    const rankProperty =
      feature.layer.thematicRankProperty ??
      (feature.layer.thematicProperty
        ? `${feature.layer.thematicProperty}_pct_rank`
        : null);
    const rank = rankProperty ? Number(source[rankProperty]) : Number.NaN;
    if (Number.isFinite(rank)) {
      if (rank < 1 / 3) return palette[0];
      if (rank < 2 / 3) return palette[1];
      return palette[2];
    }
  }

  return feature.layer.style.color;
}

function featureOverviewEntries(
  feature: SelectedFeature,
  limit = 6,
): FeatureOverviewEntry[] {
  const source = feature.properties ?? {};
  const color = featurePrimaryColor(feature);
  const priority =
    LAYER_OVERVIEW_ATTRIBUTE_PRIORITY[feature.layer.id] ??
    GROUP_OVERVIEW_ATTRIBUTE_PRIORITY[feature.layer.group] ??
    ATTRIBUTE_PRIORITY;
  const priorityEntries = priority.flatMap((key) => {
    const value = source[key];
    if (value === null || value === undefined || value === "") return [];
    return [
      {
        key,
        label: ATTRIBUTE_LABELS[key] ?? key,
        value: formatFeatureAttribute(key, value),
        color,
      },
    ];
  });
  const seenLabels = new Set(priorityEntries.map((entry) => entry.label));
  const fallbackEntries = Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      label: ATTRIBUTE_LABELS[key] ?? key,
      value: formatFeatureAttribute(key, value),
      color,
    }))
    .filter((entry) => !seenLabels.has(entry.label));

  return [...priorityEntries, ...fallbackEntries].slice(0, limit);
}

function defaultActiveLayersForFunction(id: PrimaryFunctionId) {
  return new Set(DEFAULT_VISIBLE_LAYER_IDS[id]);
}

function readStoredLlmSettings(): LlmSettings {
  if (typeof window === "undefined") return DEFAULT_LLM_SETTINGS;

  try {
    const stored = window.localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_LLM_SETTINGS;

    const parsed = JSON.parse(stored) as Partial<LlmSettings>;

    return normalizeLlmSettings({
      ...DEFAULT_LLM_SETTINGS,
      ...parsed,
    });
  } catch {
    return DEFAULT_LLM_SETTINGS;
  }
}

function normalizeLlmSettings(settings: LlmSettings): LlmSettings {
  const temperature = Number(settings.temperature);

  return {
    enabled: Boolean(settings.enabled),
    provider: settings.provider ?? DEFAULT_LLM_SETTINGS.provider,
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: Number.isFinite(temperature)
      ? Math.max(0, Math.min(1, temperature))
      : DEFAULT_LLM_SETTINGS.temperature,
  };
}

function layerOpacity(
  layer: PublicMilanLayer,
  opacities: Record<string, number>,
) {
  return opacities[layer.id] ?? layer.style.opacity;
}

function LayerSwatch({ layer }: { layer: PublicMilanLayer }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full ring-2 ring-background/70"
      style={{ backgroundColor: layer.style.color }}
    />
  );
}

function GeoJsonLayer({
  layer,
  opacity,
  material,
  contrast,
  onFeatureSelect,
}: {
  layer: PublicMilanLayer;
  opacity: number;
  material: LayerMaterial;
  contrast: number;
  onFeatureSelect: (feature: SelectedFeature) => void;
}) {
  const { map, isLoaded } = useMap();

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = `milan-source-${layer.id}`;
    const fillLayerId = `milan-fill-${layer.id}`;
    const outlineLayerId = `milan-outline-${layer.id}`;
    const lineLayerId = `milan-line-${layer.id}`;
    const pointGlowLayerId = `milan-point-glow-${layer.id}`;
    const pointLayerId = `milan-point-${layer.id}`;
    const layerIds = [
      fillLayerId,
      outlineLayerId,
      lineLayerId,
      pointGlowLayerId,
      pointLayerId,
    ];
    const isLargeSurface =
      (layer.group === "analysis" && layer.kind !== "point") ||
      layer.group === "vulnerability" ||
      (layer.group === "ptal" && layer.kind !== "point") ||
      (layer.group === "services" && layer.kind !== "point") ||
      (layer.group === "earth-observation" && layer.kind !== "point");
    const promoteId =
      layer.id === "analysis-hotspot-clusters"
        ? "cluster_id"
        : layer.group === "analysis" && layer.kind === "point"
          ? "sap_id"
          : layer.group === "analysis" && layer.kind !== "point"
            ? "h3_id"
            : layer.group === "vulnerability"
              ? "h3_id"
              : layer.group === "services" && layer.kind !== "point"
                ? "h3_id"
                : layer.group === "earth-observation" && layer.kind !== "point"
                  ? "grid_id"
                  : layer.group === "ptal" && layer.kind !== "point"
                    ? "h3_id"
                    : layer.group === "ptal" && layer.kind === "point"
                      ? "sap_id"
                      : "id";

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: `/api/layers/${layer.id}?v=${layer.sizeBytes}`,
        promoteId,
        buffer: isLargeSurface ? 0 : undefined,
        tolerance: isLargeSurface ? 1.15 : undefined,
        maxzoom: isLargeSurface ? 11 : undefined,
      });
    }

    const isPublicTransportPolygon =
      layer.group === "ptal" && layer.kind !== "point";
    const isAnalysisPolygon =
      layer.group === "analysis" && layer.kind !== "point";
    const isVulnerabilityPolygon =
      layer.group === "vulnerability" && layer.kind !== "point";
    const isServicePolygon =
      layer.group === "services" && layer.kind !== "point";
    const isEarthObservationPolygon =
      layer.group === "earth-observation" && layer.kind !== "point";
    const isContextPolygon = layer.group === "context" && layer.kind !== "point";
    const effectiveOpacity = Math.min(1, opacity * contrast);
    const analysisColor = analysisLayerColor(layer);
    const thematicColor = vulnerabilityFillColor(layer, material);
    const serviceColor = serviceClassColor(layer);
    const earthObservationColor = earthObservationClassColor(layer);
    const publicTransportColor =
      layer.thematicProperty === "ptol"
        ? ptolFillColor()
        : ptalFillColor(material);
    const polygonColor = isPublicTransportPolygon
      ? publicTransportColor
      : isAnalysisPolygon && analysisColor
        ? analysisColor
        : isServicePolygon && serviceColor
          ? serviceColor
          : isEarthObservationPolygon && earthObservationColor
            ? earthObservationColor
            : thematicColor
              ? thematicColor
              : layerMaterialColor(layer, material);
    const displayColor = layerMaterialColor(layer, material);
    const pointColor = analysisPointColor(
      layer,
      servicePointColor(layer, stopModeColor(layer, displayColor)),
    );

    if (layer.kind === "polygon" || layer.kind === "mixed") {
      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        filter: geometryFilter("Polygon"),
        paint: {
          "fill-color": isContextPolygon
            ? "rgba(255,255,255,0)"
            : polygonColor,
          "fill-opacity": isContextPolygon
            ? 0
            : isPublicTransportPolygon
            ? Math.min(effectiveOpacity + 0.16, 0.9)
            : isAnalysisPolygon
              ? analysisFillOpacity(layer, effectiveOpacity)
              : isVulnerabilityPolygon
                ? vulnerabilityFillOpacity(layer, effectiveOpacity)
                : isServicePolygon
                  ? serviceFillOpacity(layer, effectiveOpacity)
                  : isEarthObservationPolygon
                    ? earthObservationFillOpacity(layer, effectiveOpacity)
                    : effectiveOpacity,
        },
      });

      map.addLayer({
        id: outlineLayerId,
        type: "line",
        source: sourceId,
        filter: geometryFilter("Polygon"),
        paint: {
          "line-color": isContextPolygon
            ? "#1f2937"
            : isPublicTransportPolygon
              ? "rgba(15,23,42,0.34)"
              : isAnalysisPolygon
                ? "rgba(15,23,42,0.32)"
                : isVulnerabilityPolygon
                  ? "rgba(15,23,42,0.32)"
                  : isServicePolygon
                    ? "rgba(15,23,42,0.32)"
                    : isEarthObservationPolygon
                      ? "rgba(15,23,42,0.3)"
                      : displayColor,
          "line-opacity": isContextPolygon
            ? 0.82
            : isPublicTransportPolygon
              ? 0.42
              : isAnalysisPolygon
                ? 0.34
                : isVulnerabilityPolygon
                  ? 0.34
                  : isServicePolygon
                    ? 0.34
                    : isEarthObservationPolygon
                      ? 0.34
                      : Math.min(effectiveOpacity + 0.28, 0.9),
          "line-width": isContextPolygon
            ? 1.15
            : isPublicTransportPolygon
              ? 0.35
              : isAnalysisPolygon
                ? 0.32
                : isVulnerabilityPolygon
                  ? 0.32
                  : isServicePolygon
                    ? 0.32
                    : isEarthObservationPolygon
                      ? 0.32
                      : 0.8,
        },
      });
    }

    if (layer.kind === "line" || layer.kind === "mixed") {
      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        filter: geometryFilter("LineString"),
        paint: {
          "line-color": displayColor,
          "line-opacity": effectiveOpacity,
          "line-width": 2,
        },
      });
    }

    if (layer.kind === "point" || layer.kind === "mixed") {
      map.addLayer({
        id: pointGlowLayerId,
        type: "circle",
        source: sourceId,
        filter: geometryFilter("Point"),
        paint: {
          "circle-blur": 0.55,
          "circle-color": pointColor,
          "circle-opacity": Math.min(effectiveOpacity, 0.3),
          "circle-radius": 7,
        },
      });

      map.addLayer({
        id: pointLayerId,
        type: "circle",
        source: sourceId,
        filter: geometryFilter("Point"),
        paint: {
          "circle-color": pointColor,
          "circle-opacity": effectiveOpacity,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 13, 5],
          "circle-stroke-color": "rgba(255,255,255,0.92)",
          "circle-stroke-width": 1,
        },
      });
    }

    const clickableLayerIds =
      layer.group === "context" ? [] : layerIds.filter((id) => map.getLayer(id));
    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;

      onFeatureSelect({
        layer,
        properties: feature.properties as GeoJSON.GeoJsonProperties,
        coordinate: [event.lngLat.lng, event.lngLat.lat],
      });
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    clickableLayerIds.forEach((id) => {
      map.on("click", id, handleClick);
      map.on("mouseenter", id, handleMouseEnter);
      map.on("mouseleave", id, handleMouseLeave);
    });

    return () => {
      try {
        clickableLayerIds.forEach((id) => {
          map.off("click", id, handleClick);
          map.off("mouseenter", id, handleMouseEnter);
          map.off("mouseleave", id, handleMouseLeave);
        });
        map.getCanvas().style.cursor = "";

        for (const id of [...layerIds].reverse()) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // Map theme changes can dispose the MapLibre instance before layers
        // finish cleanup in dev mode.
      }
    };
  }, [contrast, isLoaded, layer, map, material, onFeatureSelect, opacity]);

  return null;
}

function MainDirectoryHeader({
  activeFunction,
}: {
  activeFunction: PrimaryFunction;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <nav className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate text-muted-foreground">Milan GIS</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{activeFunction.label}</span>
      </nav>
    </header>
  );
}

function PanelSectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );
}

function MapLegend({
  activeFunction,
  activeLayer,
}: {
  activeFunction: PrimaryFunction;
  activeLayer: PublicMilanLayer | null;
}) {
  if (activeLayer?.group === "analysis") {
    const continuousLegend = analysisContinuousLegend(activeLayer);
    const categories = analysisCategoryClasses(activeLayer);

    if (continuousLegend) {
      return <ContinuousLegend layer={activeLayer} legend={continuousLegend} />;
    }

    if (activeLayer.id === "analysis-critical-transit-stops") {
      return (
        <LegendCard>
          <div className="mb-2 text-sm font-medium leading-5">
            Critical stops
          </div>
          <div className="flex flex-col gap-1.5">
            {STOP_MODE_CLASSES.map((item) => (
              <LegendPoint key={item.value} color={item.color} label={item.label} />
            ))}
          </div>
        </LegendCard>
      );
    }

    if (categories) {
      return (
        <LegendCard className="w-64">
          <div className="mb-2 text-sm font-medium leading-5">
            {activeLayer.name}
          </div>
          <div className="flex flex-col gap-1.5">
            {categories.map((item) => (
              <LegendSwatch key={item.value} color={item.color} label={item.label} />
            ))}
          </div>
        </LegendCard>
      );
    }
  }

  if (activeLayer?.group === "vulnerability" && activeLayer.palette) {
    const colors = VULNERABILITY_PALETTES[activeLayer.palette];

    return (
      <LegendCard>
        <div className="mb-2 text-sm font-medium leading-5">
          Relative presence
        </div>
        <div className="flex flex-col gap-1.5">
          <LegendSwatch color={colors[0]} label="Low" />
          <LegendSwatch color={colors[1]} label="Medium" />
          <LegendSwatch color={colors[2]} label="High" />
          <LegendSwatch color={VULNERABILITY_NO_DATA_COLOR} label="No data" />
        </div>
      </LegendCard>
    );
  }

  if (activeLayer?.id === "services-essential-service-points") {
    return (
      <LegendCard>
        <div className="mb-2 text-sm font-medium leading-5">
          Essential services
        </div>
        <div className="flex flex-col gap-1.5">
          {SERVICE_POINT_CLASSES.map((item) => (
            <LegendPoint key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </LegendCard>
    );
  }

  if (activeLayer?.id === "services-essential-service-accessibility") {
    return (
      <LegendCard className="w-56">
        <div className="mb-2 text-sm font-medium leading-5">
          Essential service accessibility
        </div>
        <div className="flex flex-col gap-1.5">
          {SERVICE_ACCESSIBILITY_CLASSES.map((item) => (
            <LegendSwatch key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </LegendCard>
    );
  }

  if (activeLayer?.id === "services-essential-service-gap") {
    return (
      <LegendCard className="w-56">
        <div className="mb-2 text-sm font-medium leading-5">
          Essential service gap
        </div>
        <div className="flex flex-col gap-1.5">
          {SERVICE_GAP_CLASSES.map((item) => (
            <LegendSwatch key={item.value} color={item.color} label={item.label} />
          ))}
          <LegendSwatch color={VULNERABILITY_NO_DATA_COLOR} label="No data" />
        </div>
      </LegendCard>
    );
  }

  if (activeLayer?.group === "earth-observation") {
    const legend = earthObservationLegend(activeLayer);

    if (legend) return <ContinuousLegend layer={activeLayer} legend={legend} />;
  }

  if (activeFunction.id === "ptal" && activeLayer?.thematicProperty === "ptal") {
    return (
      <LegendCard className="w-64">
        <div className="mb-2 text-sm font-medium leading-5">
          Public Transport Accessibility Level (PTAL)
          <span className="ml-2 font-normal text-slate-500">
            4.8 km/h
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {PTAL_CLASSES.map((item) => (
            <LegendSwatch key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </LegendCard>
    );
  }

  if (activeFunction.id === "ptal" && activeLayer?.thematicProperty === "ptol") {
    return (
      <LegendCard className="w-64">
        <div className="mb-2 text-sm font-medium leading-5">
          Public Transport Opportunity Level (PTOL)
        </div>

        <div className="flex flex-col gap-1.5">
          {PTOL_CLASSES.map((item) => (
            <LegendSwatch key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </LegendCard>
    );
  }

  if (!activeLayer) return null;

  if (activeLayer.id === "ptal-stops-all") {
    return (
      <LegendCard>
        <div className="mb-2 text-sm font-medium leading-5">Stops</div>
        <div className="flex flex-col gap-1.5">
          {STOP_MODE_CLASSES.map((item) => (
            <LegendPoint key={item.value} color={item.color} label={item.label} />
          ))}
        </div>
      </LegendCard>
    );
  }

  return (
    <LegendCard>
      <div className="mb-2 text-sm font-medium leading-5">{activeLayer.name}</div>
      <LegendPoint color={activeLayer.style.color} label={activeLayer.kind} />
    </LegendCard>
  );
}

function VulnerabilityFigureTitle({
  layer,
}: {
  layer: PublicMilanLayer | null;
}) {
  if (layer?.group !== "vulnerability") return null;

  const copy = vulnerabilityFigureCopy(layer);

  return (
    <>
      <div className="pointer-events-none absolute right-8 bottom-7 z-20 hidden text-sm text-slate-500 lg:block">
        {copy.note}
      </div>
    </>
  );
}

function LegendCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-6 left-6 z-20 hidden w-48 rounded-[3px] border border-slate-300 bg-white/88 p-2.5 text-sm text-slate-800 shadow-none lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ContinuousLegend({
  layer,
  legend,
}: {
  layer: PublicMilanLayer;
  legend: ContinuousLegendConfig;
}) {
  const max = legend.max ?? 1;
  const gradient = `linear-gradient(to top, ${legend.stops
    .map(([value, color]) => `${color} ${(value / max) * 100}%`)
    .join(", ")})`;
  const ticks =
    max === 100 ? [100, 75, 50, 25, 0] : [1, 0.8, 0.6, 0.4, 0.2, 0];

  return (
    <div className="absolute bottom-6 left-6 z-20 hidden rounded-[3px] border border-slate-300 bg-white/88 p-3 text-sm text-slate-800 shadow-none lg:block">
      <div className="mb-2 max-w-36 text-xs font-medium leading-4">
        {layer.name}
      </div>
      <div className="flex items-stretch gap-2">
        <div
          className="h-48 w-5 border border-slate-600"
          style={{ background: gradient }}
        />
        <div className="flex h-48 flex-col justify-between text-[11px] leading-none text-slate-700">
          {ticks.map((tick) => (
            <span key={tick}>
              {max === 100 ? Math.round(tick) : tick.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 max-w-36 text-[11px] leading-4 text-slate-500">
        {legend.label}
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-4 w-8 border border-slate-200"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function LegendPoint({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-2.5 rounded-full border border-foreground/60"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function LayerTreeControl({
  open,
  groups,
  activeFunction,
  activeLayerIds,
  opacities,
  basemap,
  detailOpen,
  onOpenChange,
  onSelectLayer,
  onInspectLayer,
  onOpacityChange,
  onBasemapChange,
}: {
  open: boolean;
  groups: MilanLayerGroup[];
  activeFunction: PrimaryFunction;
  activeLayerIds: Set<string>;
  opacities: Record<string, number>;
  basemap: BasemapId;
  detailOpen: boolean;
  onOpenChange: (value: boolean) => void;
  onSelectLayer: (id: string) => void;
  onInspectLayer: (layer: PublicMilanLayer) => void;
  onOpacityChange: (id: string, value: number) => void;
  onBasemapChange: (id: BasemapId) => void;
}) {
  const activeGroup = activeFunction.groupId
    ? groups.find((group) => group.id === activeFunction.groupId)
    : null;
  const selectedLayerId = Array.from(activeLayerIds)[0] ?? null;
  const selectedLayer =
    activeGroup?.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedOpacity = selectedLayer
    ? layerOpacity(selectedLayer, opacities)
    : 1;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title="Layer manager"
        className="absolute top-4 right-4 z-20 flex h-10 items-center gap-2 rounded-md border bg-background/90 px-3 text-sm font-medium shadow-lg backdrop-blur-md transition-colors hover:bg-accent"
      >
        <LayerStackIcon className="size-4" />
        <span>Layers</span>
        <Badge variant="secondary">{activeLayerIds.size}</Badge>
      </button>

      {open && (
        <aside
          className="absolute top-16 bottom-4 z-20 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border bg-background/94 shadow-2xl backdrop-blur-md transition-[right] duration-200"
          style={{ right: detailOpen ? 400 : 16 }}
        >
          <div className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Layers</div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                title="Close layers"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {selectedLayer && (
              <LayerOpacityControl
                layer={selectedLayer}
                opacity={selectedOpacity}
                onOpacityChange={onOpacityChange}
              />
            )}

            <BasemapSelector
              basemap={basemap}
              onBasemapChange={onBasemapChange}
            />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 p-3">
              {activeGroup ? (
                activeGroup.layers.map((layer) => (
                  <LayerSelectRow
                    key={layer.id}
                    layer={layer}
                    selected={selectedLayerId === layer.id}
                    onSelect={onSelectLayer}
                    onInspect={onInspectLayer}
                  />
                ))
              ) : (
                <div className="px-2 py-8 text-sm text-muted-foreground">
                  This function does not have map layers yet.
                </div>
              )}
            </div>
          </ScrollArea>

        </aside>
      )}
    </>
  );
}

function LayerOpacityControl({
  layer,
  opacity,
  onOpacityChange,
}: {
  layer: PublicMilanLayer;
  opacity: number;
  onOpacityChange: (id: string, value: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Opacity</span>
        <span className="font-medium tabular-nums">
          {Math.round(opacity * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={20}
        max={100}
        value={Math.round(opacity * 100)}
        onChange={(event) =>
          onOpacityChange(layer.id, Number(event.target.value) / 100)
        }
        className="h-2 w-full accent-primary"
      />
    </div>
  );
}

function BasemapSelector({
  basemap,
  onBasemapChange,
}: {
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs text-muted-foreground">Basemap</div>
      <div className="grid grid-cols-2 gap-2">
        {BASEMAP_OPTIONS.map((option) => {
          const selected = option.id === basemap;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onBasemapChange(option.id)}
              className={cn(
                "relative h-12 overflow-hidden rounded-md border text-left transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/55"
                  : "border-border hover:border-foreground/35",
              )}
              style={option.preview}
            >
              <span className="absolute top-1.5 left-1.5 rounded-sm bg-background/86 px-1.5 py-0.5 text-[11px] font-semibold leading-4 shadow-sm">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayerSelectRow({
  layer,
  selected,
  onSelect,
  onInspect,
}: {
  layer: PublicMilanLayer;
  selected: boolean;
  onSelect: (id: string) => void;
  onInspect: (layer: PublicMilanLayer) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        selected ? "border-primary bg-accent/45" : "bg-background/70",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(layer.id)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <LayerSwatch layer={layer} />
          <span className="truncate text-sm font-medium">{layer.name}</span>
        </span>
      </button>
      {selected && (
        <button
          type="button"
          onClick={() => onInspect(layer)}
          className="mx-3 mb-3 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          Item data
        </button>
      )}
    </div>
  );
}

function DetailInspector({
  open,
  selectedLayer,
  selectedFeature,
  onClose,
}: {
  open: boolean;
  selectedLayer: PublicMilanLayer | null;
  selectedFeature: SelectedFeature | null;
  onClose: () => void;
}) {
  const layer = selectedFeature?.layer ?? selectedLayer;
  const propertyEntries = selectedFeature
    ? featureItemEntries(selectedFeature.properties)
    : [];
  const focusItems = layer ? FOCUS_DATA[layer.group as PrimaryFunctionId] ?? [] : [];
  const [detailModeState, setDetailModeState] = React.useState<{
    coordinateKey: string | null;
    value: FeatureDetailMode;
  }>({ coordinateKey: null, value: "overview" });
  const [addressLookup, setAddressLookup] = React.useState<AddressLookupState>({
    coordinateKey: null,
    status: "idle",
    address: null,
  });
  const featureCoordinateKey = selectedFeature
    ? `${selectedFeature.coordinate[0].toFixed(5)},${selectedFeature.coordinate[1].toFixed(5)}`
    : null;
  const detailMode =
    detailModeState.coordinateKey === featureCoordinateKey
      ? detailModeState.value
      : "overview";
  const setFeatureDetailMode = React.useCallback(
    (value: FeatureDetailMode) => {
      setDetailModeState({ coordinateKey: featureCoordinateKey, value });
    },
    [featureCoordinateKey],
  );
  const addressLookupForFeature: AddressLookupState =
    !selectedFeature || !featureCoordinateKey
      ? { coordinateKey: null, status: "idle", address: null }
      : addressLookup.coordinateKey === featureCoordinateKey
        ? addressLookup
        : { coordinateKey: featureCoordinateKey, status: "loading", address: null };

  React.useEffect(() => {
    if (!selectedFeature || !featureCoordinateKey) return;

    const controller = new AbortController();
    const [lon, lat] = selectedFeature.coordinate;

    fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Location lookup unavailable");
        return (await response.json()) as ReverseGeocodeData;
      })
      .then((data) => {
        setAddressLookup({
          coordinateKey: featureCoordinateKey,
          status: "success",
          address: data.address,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAddressLookup({
          coordinateKey: featureCoordinateKey,
          status: "error",
          address: null,
        });
      });

    return () => controller.abort();
  }, [selectedFeature, featureCoordinateKey]);

  return (
    <aside
      className={cn(
        "absolute inset-y-0 right-0 z-30 w-full max-w-[384px] border-l bg-background shadow-2xl transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Data</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close detail"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {layer ? (
            <div className="space-y-3 p-3">
              <section className="flex items-center gap-2">
                <LayerSwatch layer={layer} />
                <h2 className="min-w-0 truncate text-base font-semibold">
                  {layer.name}
                </h2>
              </section>

              {selectedFeature ? (
                <>
                  <FeatureDetailTabs
                    value={detailMode}
                    onChange={setFeatureDetailMode}
                  />
                  {detailMode === "overview" ? (
                    <FeaturePlaceOverview
                      feature={selectedFeature}
                      addressLookup={addressLookupForFeature}
                    />
                  ) : (
                    <AdvancedFeatureData
                      layer={layer}
                      feature={selectedFeature}
                      propertyEntries={propertyEntries}
                    />
                  )}
                </>
              ) : (
                <>
                  <section>
                    <PanelSectionTitle
                      label="Data Focus"
                      count={focusItems.length}
                    />
                    <div className="mt-2 space-y-2">
                      {focusItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-md border">
                    <DetailRow label="Geometry" value={layer.kind} />
                    <DetailRow label="Dataset" value={layer.group} />
                    <DetailRow label="Source" value={layer.fileName} />
                  </section>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a layer or map feature to open focused data here.
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}

function FeatureDetailTabs({
  value,
  onChange,
}: {
  value: FeatureDetailMode;
  onChange: (value: FeatureDetailMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-md border bg-muted/20 p-1">
      {[
        ["overview", "Overview"],
        ["advanced", "Advanced"],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id as FeatureDetailMode)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            value === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FeatureLayerSummary({ feature }: { feature: SelectedFeature }) {
  const entries = featureOverviewEntries(feature);

  if (entries.length === 0) return null;

  return (
    <section>
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        Layer data
      </div>
      <div className="overflow-hidden rounded-md border">
        {entries.map((entry, index) => (
          <DetailRow
            key={entry.key}
            label={entry.label}
            value={entry.value}
            color={index === 0 ? entry.color : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturePlaceOverview({
  feature,
  addressLookup,
}: {
  feature: SelectedFeature;
  addressLookup: AddressLookupState;
}) {
  const [lon, lat] = feature.coordinate;

  return (
    <div className="space-y-3">
      <FeatureLayerSummary feature={feature} />
      <FeatureAddressRows addressLookup={addressLookup} />

      <section>
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Google Maps
        </div>
        <GoogleMapEmbed lat={lat} lon={lon} />
      </section>
    </div>
  );
}

function FeatureAddressRows({
  addressLookup,
}: {
  addressLookup: AddressLookupState;
}) {
  if (addressLookup.status === "loading") {
    return (
      <section className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
        Loading map address...
      </section>
    );
  }

  if (addressLookup.status !== "success" || !addressLookup.address) {
    return null;
  }

  const address = addressLookup.address;

  return (
    <section className="rounded-md border">
      <DetailRow label="Road" value={address.road ?? "Unknown"} />
      <DetailRow
        label="Area"
        value={
          address.neighbourhood ??
          address.suburb ??
          address.quarter ??
          "Unknown"
        }
      />
      <DetailRow
        label="City"
        value={address.city ?? address.town ?? address.municipality ?? "Milan"}
      />
    </section>
  );
}

function GoogleMapEmbed({ lat, lon }: { lat: number; lon: number }) {
  if (!GOOGLE_MAPS_EMBED_API_KEY) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
        Google Maps embed key is not configured.
      </div>
    );
  }

  const src = googleMapEmbedUrl(lat, lon);

  return (
    <div className="overflow-hidden rounded-md border bg-muted/20">
      <iframe
        title="Google Maps location preview"
        src={src}
        className="h-48 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

function AdvancedFeatureData({
  layer,
  feature,
  propertyEntries,
}: {
  layer: PublicMilanLayer;
  feature: SelectedFeature;
  propertyEntries: readonly (readonly [string, string])[];
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-md border">
        <DetailRow label="Geometry" value={layer.kind} />
        <DetailRow label="Dataset" value={layer.group} />
        <DetailRow label="Source" value={layer.fileName} />
      </section>

      <section className="rounded-md border">
        <DetailRow label="Longitude" value={feature.coordinate[0].toFixed(5)} />
        <DetailRow label="Latitude" value={feature.coordinate[1].toFixed(5)} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Item List</span>
          <span>{propertyEntries.length}</span>
        </div>
        <div className="overflow-hidden rounded-md border">
          {propertyEntries.length > 0 ? (
            propertyEntries.map(([key, value]) => (
              <DetailRow key={key} label={key} value={value} />
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No properties on this feature.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function googleMapEmbedUrl(lat: number, lon: number) {
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_EMBED_API_KEY ?? "",
    q: `${lat},${lon}`,
    zoom: "17",
    maptype: "roadmap",
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

function DetailRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2 font-medium">
        {color ? (
          <span
            className="size-2.5 shrink-0 rounded-full ring-2 ring-background"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 truncate">{value}</span>
      </span>
    </div>
  );
}

const DASHBOARD_PANEL_CLASS =
  "min-h-0 overflow-hidden rounded-xl bg-background/80 py-0 ring-0 shadow-none";

type AnalysisChatMessage = {
  role: "assistant" | "user";
  content: string;
};

function AnalysisDashboard({
  groups,
  theme,
  llmSettings,
}: {
  groups: MilanLayerGroup[];
  theme: ThemeMode;
  llmSettings: LlmSettings;
}) {
  const [selectedFeature, setSelectedFeature] =
    React.useState<SelectedFeature | null>(null);
  const priorityLayer = findLayer(groups, "analysis-intervention-priority");
  const boundaryLayer = findLayer(
    groups,
    "context-boundary-citta-metropolitana-milano",
  );
  const selectedProps = selectedFeature?.properties ?? null;
  const priorityScore = analysisNumber(
    selectedProps,
    "intervention_priority_score",
    ANALYSIS_DASHBOARD_SUMMARY.meanPriority,
  );
  const hotspotScore = analysisNumber(
    selectedProps,
    "hotspot_score",
    ANALYSIS_DASHBOARD_SUMMARY.meanHotspot,
  );
  const confidenceScore = analysisNumber(
    selectedProps,
    "data_confidence_score",
    ANALYSIS_DASHBOARD_SUMMARY.meanConfidence,
  );
  const breakdown = React.useMemo(
    () =>
      ANALYSIS_DASHBOARD_SUMMARY.breakdown.map((item) => ({
        ...item,
        value: analysisNumber(selectedProps, item.key, item.value),
      })),
    [selectedProps],
  );
  const dashboardContext = React.useMemo(
    () =>
      buildAnalysisDashboardContext({
        selectedFeature,
        priorityScore,
        hotspotScore,
        confidenceScore,
        breakdown,
    }),
    [breakdown, confidenceScore, hotspotScore, priorityScore, selectedFeature],
  );
  const priorityStatus = priorityState(priorityScore);
  const showAnalysisChat = llmSettings.enabled;
  const recommendationItems = buildHumanRecommendationItems({
    breakdown,
    confidenceScore,
    hotspotScore,
    priorityScore,
  });
  const reportPayload = {
    context: dashboardContext,
    priorityScore,
    hotspotScore,
    confidenceScore,
    breakdown,
    selectedFeature,
  };

  return (
    <div className="relative h-full overflow-hidden bg-muted/20 p-2.5 lg:p-3">
      <div className="grid h-full min-h-0 gap-2 lg:grid-cols-[minmax(0,2.4fr)_minmax(320px,0.72fr)] lg:grid-rows-[minmax(0,1.72fr)_minmax(150px,0.28fr)]">
        <Card className={cn(DASHBOARD_PANEL_CLASS, "lg:col-start-1 lg:row-start-1")}>
          <CardContent className="h-full p-0">
            <div className="relative h-full overflow-hidden rounded-xl bg-muted">
              {priorityLayer ? (
                <GeoMap
                  key={`analysis-dashboard-${theme}`}
                  theme={theme}
                  center={[9.19, 45.47]}
                  zoom={9.2}
                  minZoom={7}
                  maxZoom={14}
                  pitch={0}
                  styles={BASEMAP_STYLES.current}
                >
                  <GeoJsonLayer
                    layer={priorityLayer}
                    opacity={0.84}
                    material="default"
                    contrast={1}
                    onFeatureSelect={setSelectedFeature}
                  />
                  {boundaryLayer ? (
                    <GeoJsonLayer
                      layer={boundaryLayer}
                      opacity={1}
                      material="default"
                      contrast={1}
                      onFeatureSelect={setSelectedFeature}
                    />
                  ) : null}
                </GeoMap>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Analysis priority layer is not available.
                </div>
              )}
              <DashboardMapLegend />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(DASHBOARD_PANEL_CLASS, "lg:col-start-2 lg:row-span-2")}>
          <CardContent
            className={cn(
              "grid h-full min-h-0 gap-2 p-0",
              showAnalysisChat
                ? "grid-rows-[1fr_1fr_minmax(190px,0.9fr)]"
                : "grid-rows-2",
            )}
          >
            <div
              className="flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-muted/40 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div
                  className="inline-flex items-center gap-2 rounded-full bg-background/75 px-3 py-1 text-xs font-semibold"
                  style={{ color: scoreRiskColor(priorityScore) }}
                >
                  {priorityStatus.critical ? <TriangleAlert className="size-4" /> : null}
                  {priorityStatus.label}
                </div>
                <span className="text-xs text-muted-foreground">
                  Citywide baseline
                </span>
              </div>
              <ScoreGauge
                label="Intervention priority"
                value={priorityScore}
                size="large"
              />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {priorityStatus.description}
              </p>
            </div>

            <div className="flex min-h-0 flex-col justify-center overflow-hidden rounded-2xl bg-background/70 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lightbulb className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-base font-semibold">
                    Current recommendation
                  </div>
                  <ul className="mt-3 flex flex-col gap-2 text-sm leading-5 text-muted-foreground">
                    {recommendationItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button
                type="button"
                size="default"
                variant="secondary"
                className="mt-5 w-fit px-4"
                onClick={() => {
                  void exportAnalysisReport(reportPayload);
                }}
              >
                <FileText data-icon="inline-start" />
                Export report
              </Button>
            </div>

            {showAnalysisChat ? (
              <AnalysisChatBox
                dashboardContext={dashboardContext}
                llmSettings={llmSettings}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className={cn(DASHBOARD_PANEL_CLASS, "lg:col-start-1 lg:row-start-2")}>
          <CardContent className="flex h-full min-h-0 flex-col justify-center gap-3 p-5">
            <div className="text-xs font-medium text-muted-foreground">
              Score breakdown
            </div>
            <div className="flex min-h-0 flex-col justify-center gap-2.5">
              {breakdown.map((item) => (
                <DashboardScoreBar
                  key={item.key}
                  scoreKey={item.key}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function findLayer(groups: MilanLayerGroup[], id: string) {
  return groups.flatMap((group) => group.layers).find((layer) => layer.id === id) ?? null;
}

function analysisNumber(
  properties: GeoJSON.GeoJsonProperties | null,
  key: string,
  fallback: number,
) {
  const value = properties?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return fallback;
}

function analysisText(
  properties: GeoJSON.GeoJsonProperties | null,
  key: string,
  fallback = "Citywide baseline",
) {
  const value = properties?.[key];
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function buildHumanRecommendationItems({
  breakdown,
  confidenceScore,
  hotspotScore,
  priorityScore,
}: {
  breakdown: Array<{ key: string; label: string; value: number }>;
  confidenceScore: number;
  hotspotScore: number;
  priorityScore: number;
}) {
  const driverItems = breakdown
    .filter((item) => item.key !== "data_confidence_score")
    .sort((a, b) => b.value - a.value);
  const mainDriver = driverItems[0];
  const secondDriver = driverItems[1];
  const items: string[] = [];

  if (priorityScore >= 70) {
    items.push(
      `Treat this as a first-pass priority area: the overall score is ${Math.round(
        priorityScore,
      )}/100, so project sequencing should start here before moving to lower-pressure cells.`,
    );
  } else if (priorityScore >= 45) {
    items.push(
      `Keep this area on the watch list: the priority score is ${Math.round(
        priorityScore,
      )}/100, so it needs targeted checks rather than a heavy intervention by default.`,
    );
  } else {
    items.push(
      `Do not overbuild here yet: the current priority score is ${Math.round(
        priorityScore,
      )}/100, so the practical move is monitoring and keeping baseline access visible.`,
    );
  }

  if (mainDriver) {
    items.push(humanDriverSentence(mainDriver, "main"));
  }

  if (secondDriver && secondDriver.value >= 45) {
    items.push(humanDriverSentence(secondDriver, "secondary"));
  }

  if (hotspotScore >= 60) {
    items.push(
      `The hotspot signal is also high (${Math.round(
        hotspotScore,
      )}/100), so validate whether several problems overlap in the same streets before choosing one isolated fix.`,
    );
  }

  items.push(
    confidenceScore >= 75
      ? `Data confidence is strong (${Math.round(
          confidenceScore,
        )}/100), but still check GTFS/NeTEx schedules and local service points before funding decisions.`
      : `Data confidence is only ${Math.round(
          confidenceScore,
        )}/100, so use the dashboard as a screening tool and confirm the evidence locally first.`,
  );

  return Array.from(new Set(items)).slice(0, 4);
}

function humanDriverSentence(
  driver: { label: string; value: number },
  role: "main" | "secondary",
) {
  const score = Math.round(driver.value);
  const prefix = role === "main" ? "The strongest signal" : "The next signal";

  if (driver.label === "Essential services deficit") {
    return `${prefix} is access to daily services (${score}/100). Check schools, healthcare, groceries and job access before treating this as a transit-only problem.`;
  }

  if (driver.label === "PTAL deficit") {
    return `${prefix} is public transport deficit (${score}/100). Review frequency, interchange quality and first/last-mile access before deciding between new coverage and better service.`;
  }

  if (driver.label === "Social vulnerability") {
    return `${prefix} is social vulnerability (${score}/100). Prioritize measures that reduce everyday travel burden for residents with fewer mobility choices.`;
  }

  if (driver.label === "EO territorial disadvantage") {
    return `${prefix} is territorial context from EO data (${score}/100). Confirm whether growth, built-up intensity or land-use isolation is creating the access problem.`;
  }

  return `${prefix} is ${driver.label.toLowerCase()} (${score}/100). Validate the local evidence before turning this score into an intervention package.`;
}

function buildAnalysisDashboardContext({
  selectedFeature,
  priorityScore,
  hotspotScore,
  confidenceScore,
  breakdown,
}: {
  selectedFeature: SelectedFeature | null;
  priorityScore: number;
  hotspotScore: number;
  confidenceScore: number;
  breakdown: Array<{ label: string; value: number }>;
}) {
  const properties = selectedFeature?.properties ?? null;

  return {
    scope: selectedFeature
      ? {
          h3_id: analysisText(properties, "h3_id", "selected H3"),
          municipality: analysisText(properties, "municipality_name", "Unknown"),
        }
      : {
          area: "Milan metropolitan citywide dashboard",
          h3_cells: ANALYSIS_DASHBOARD_SUMMARY.h3Cells,
        },
    scores: {
      intervention_priority_score: priorityScore,
      hotspot_score: hotspotScore,
      data_confidence_score: confidenceScore,
    },
    score_breakdown: Object.fromEntries(
      breakdown.map((item) => [item.label, item.value]),
    ),
    diagnosis: {
      priority_class: analysisText(properties, "priority_class", "mixed"),
      hotspot_class: analysisText(properties, "hotspot_class", "mixed"),
      typology: analysisText(properties, "typology", "citywide mix"),
      dominant_drivers: analysisText(
        properties,
        "dominant_drivers",
        "PT deficit, service deficit, social vulnerability and EO context",
      ),
      suggested_intervention_family: analysisText(
        properties,
        "suggested_intervention_family",
        "Prioritize targeted service improvements and validate local constraints.",
      ),
    },
    city2graph: {
      transit_dependency_diagnosis: analysisText(
        properties,
        "transit_dependency_diagnosis",
        "Use GTFS/NeTEx dependency layer for route and stop evidence.",
      ),
      primary_route_line: analysisText(properties, "primary_route_line", "n/a"),
      primary_stop_id: analysisText(properties, "primary_stop_id", "n/a"),
      recommended_gtfs_action: analysisText(
        properties,
        "recommended_gtfs_action",
        "Check frequency, redundancy and feeder access before new infrastructure.",
      ),
    },
    caveats: [
      "Scores are precomputed and must not be recalculated by the LLM.",
      "Road connectivity is a proxy derived from built-up and artificial land-cover evidence.",
      "Service accessibility is aggregated from 100 m grid data to H3 res9.",
      "city2graph evidence explains transit dependency and does not replace the ABCD scoring formula.",
    ],
  };
}

function DashboardMapLegend() {
  const gradient = `linear-gradient(to right, ${ANALYSIS_SCORE_CLASSES.map(
    (item) => `${item.color} ${item.value}%`,
  ).join(", ")})`;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-52 rounded-lg bg-background/80 p-2 text-[11px] shadow-lg backdrop-blur-md">
      <div className="mb-1.5 font-medium">Intervention priority</div>
      <div className="h-2 rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-muted-foreground">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}

function DashboardScoreBar({
  scoreKey,
  label,
  value,
  color,
}: {
  scoreKey: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[11rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted"
          style={{ color }}
          aria-hidden="true"
        >
          <ScoreBreakdownIcon scoreKey={scoreKey} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="text-right font-medium tabular-nums">
        {value.toFixed(0)}
      </span>
    </div>
  );
}

function ScoreBreakdownIcon({ scoreKey }: { scoreKey: string }) {
  if (scoreKey === "svi_score") return <UsersRound className="size-4" />;
  if (scoreKey === "pt_deficit_score") return <TramFront className="size-4" />;
  if (scoreKey === "essential_services_deficit_score") {
    return <HandHeart className="size-4" />;
  }
  if (scoreKey === "eo_territorial_disadvantage_score") {
    return <Satellite className="size-4" />;
  }
  return <DatabaseZap className="size-4" />;
}

function priorityState(value: number) {
  if (value >= 70) {
    return {
      label: "High priority",
      critical: true,
      description:
        "Critical intervention pressure: priority drivers should be validated before sequencing projects.",
    };
  }
  if (value >= 45) {
    return {
      label: "Monitor",
      critical: false,
      description:
        "Moderate intervention pressure: compare local evidence before escalating.",
    };
  }
  return {
    label: "Lower concern",
    critical: false,
    description:
      "Lower immediate pressure: monitor evidence shifts and keep baseline coverage visible.",
  };
}

function scoreRiskColor(value: number) {
  if (value >= 75) return "#dc2626";
  if (value >= 60) return "#f97316";
  if (value >= 40) return "#facc15";
  return "#60a5fa";
}

function ScoreGauge({
  label,
  value,
  size = "compact",
}: {
  label: string;
  value: number;
  size?: "large" | "compact";
}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  const color = scoreRiskColor(boundedValue);
  const isLarge = size === "large";

  if (isLarge) {
    return (
      <div className="grid w-full min-w-0 grid-cols-[112px_minmax(9.5rem,1fr)] items-center gap-4 overflow-hidden">
        <svg
          viewBox="0 0 120 78"
          className="h-24 w-28"
          aria-hidden="true"
        >
          <path
            d="M18 64A42 42 0 0 1 102 64"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="12"
            className="text-muted"
            pathLength={100}
          />
          <path
            d="M18 64A42 42 0 0 1 102 64"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="12"
            pathLength={100}
            strokeDasharray={`${boundedValue} ${100 - boundedValue}`}
          />
          <line
            x1="60"
            y1="64"
            x2="60"
            y2="34"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="4"
            transform={`rotate(${-90 + boundedValue * 1.8} 60 64)`}
          />
          <circle cx="60" cy="64" r="4" fill={color} />
        </svg>
        <div className="min-w-[9.5rem] justify-self-end">
          <div
            className="flex w-[9.5rem] items-baseline justify-end whitespace-nowrap leading-none tabular-nums"
            style={{ color }}
          >
            <span className="inline-block w-[6.2rem] text-right text-[clamp(2.5rem,3.4vw,3.1rem)] font-semibold">
              {Math.round(boundedValue)}
            </span>
            <span className="ml-1 inline-block w-11 shrink-0 text-left text-base font-semibold">/100</span>
          </div>
          <div className="mt-1 truncate text-right text-xs text-muted-foreground">
            {label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 120 78"
        className="h-14 w-20"
        aria-hidden="true"
      >
        <path
          d="M18 64A42 42 0 0 1 102 64"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="12"
          className="text-muted"
          pathLength={100}
        />
        <path
          d="M18 64A42 42 0 0 1 102 64"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="12"
          pathLength={100}
          strokeDasharray={`${boundedValue} ${100 - boundedValue}`}
        />
        <circle cx="60" cy="64" r="4" fill={color} />
      </svg>
      <div className="min-w-0">
        <div
          className="text-2xl font-semibold tabular-nums"
          style={{ color }}
        >
          {Math.round(boundedValue)}
          <span className="text-xs">/100</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function AnalysisChatBox({
  dashboardContext,
  llmSettings,
}: {
  dashboardContext: ReturnType<typeof buildAnalysisDashboardContext>;
  llmSettings: LlmSettings;
}) {
  const [prompt, setPrompt] = React.useState(ANALYSIS_PRESET_QUESTIONS[0]);
  const [messages, setMessages] = React.useState<AnalysisChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask about priority evidence, intervention sequence, data confidence, or local validation.",
    },
  ]);
  const [state, setState] = React.useState<AnalysisInterpretState>({
    status: "idle",
    answer: null,
    error: null,
  });
  const canAsk =
    llmSettings.enabled &&
    llmSettings.baseUrl.trim() &&
    llmSettings.apiKey.trim() &&
    llmSettings.model.trim();

  const askAssistant = React.useCallback(
    async (question: string) => {
      const trimmedQuestion = question.trim();
      if (!canAsk || !trimmedQuestion) return;

      setState({ status: "loading", answer: null, error: null });
      setMessages((current) => [
        ...current,
        { role: "user", content: trimmedQuestion },
      ]);
      setPrompt("");

      try {
        const response = await fetch("/api/analysis/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...llmSettings,
            question: trimmedQuestion,
            context: dashboardContext,
          }),
        });
        const data = (await response.json()) as AnalysisInterpretResponse;

        if (!response.ok || !data.answer) {
          throw new Error(data.error ?? "AI explanation failed");
        }

        setState({ status: "success", answer: data.answer, error: null });
        setMessages((current) => [
          ...current,
          { role: "assistant", content: data.answer ?? "" },
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI explanation failed";
        setState({ status: "error", answer: null, error: message });
        setMessages((current) => [
          ...current,
          { role: "assistant", content: message },
        ]);
      }
    },
    [canAsk, dashboardContext, llmSettings],
  );

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Analysis chat</div>
            <div className="truncate text-xs text-muted-foreground">
              OpenAI-compatible endpoint
            </div>
          </div>
        </div>
        <Badge variant={canAsk ? "secondary" : "outline"}>
          {canAsk ? "Ready" : "Off"}
        </Badge>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl bg-muted/35 p-2">
        <div className="flex flex-col gap-2">
          {messages.slice(-4).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "max-w-[92%] rounded-xl px-3 py-2 text-xs leading-5",
                message.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-background/80 text-foreground",
              )}
            >
              {message.content}
            </div>
          ))}
          {state.status === "loading" ? (
            <div className="self-start rounded-xl bg-background/80 px-3 py-2 text-xs text-muted-foreground">
              Reading dashboard evidence...
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ANALYSIS_PRESET_QUESTIONS.slice(0, 2).map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => setPrompt(preset)}
          >
            {preset}
          </Button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            canAsk
              ? "Ask about the selected evidence..."
              : "Enable AI and set API key in Settings."
          }
          className="min-h-10 resize-none text-sm"
          disabled={!canAsk}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => askAssistant(prompt)}
          disabled={!canAsk || state.status === "loading" || !prompt.trim()}
        >
          <SendHorizontal />
          <span className="sr-only">Ask analysis chat</span>
        </Button>
      </div>
    </div>
  );
}

async function exportAnalysisReport({
  context,
  priorityScore,
  hotspotScore,
  confidenceScore,
  breakdown,
  selectedFeature,
}: {
  context: ReturnType<typeof buildAnalysisDashboardContext>;
  priorityScore: number;
  hotspotScore: number;
  confidenceScore: number;
  breakdown: Array<{ label: string; value: number; color: string }>;
  selectedFeature: SelectedFeature | null;
}) {
  if (typeof window === "undefined") return;

  const properties = selectedFeature?.properties ?? null;
  const params = new URLSearchParams();
  const h3Id = analysisText(properties, "h3_id", "");
  const municipalityName = analysisText(properties, "municipality_name", "");
  if (h3Id) params.set("h3_id", h3Id);
  if (municipalityName) params.set("municipality", municipalityName);

  let reportContext: AnalysisReportContext = {};

  try {
    const response = await fetch(
      `/api/analysis/report-context${params.size ? `?${params.toString()}` : ""}`,
    );

    if (response.ok) {
      reportContext = (await response.json()) as AnalysisReportContext;
    }
  } catch {
    reportContext = {};
  }

  const reportWindow = window.open("", "_blank", "width=980,height=1200");
  if (!reportWindow) return;

  reportWindow.document.open();
  reportWindow.document.write(
    buildAnalysisReportHtml({
      context,
      priorityScore,
      hotspotScore,
      confidenceScore,
      breakdown,
      selectedFeature,
      reportContext,
    }),
  );
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 350);
}

function buildAnalysisReportHtml({
  context,
  priorityScore,
  hotspotScore,
  confidenceScore,
  breakdown,
  selectedFeature,
  reportContext,
}: {
  context: ReturnType<typeof buildAnalysisDashboardContext>;
  priorityScore: number;
  hotspotScore: number;
  confidenceScore: number;
  breakdown: Array<{ label: string; value: number; color: string }>;
  selectedFeature: SelectedFeature | null;
  reportContext: AnalysisReportContext;
}) {
  const summary = reportContext.summary ?? null;
  const selectedCard = reportContext.selectedCard ?? null;
  const topCards = (reportContext.topCards?.length
    ? reportContext.topCards
    : summary?.top_10_h3 ?? []
  ).slice(0, 10);
  const properties = selectedFeature?.properties ?? null;
  const studyAreaName =
    selectedCard?.municipality ??
    selectedCard?.municipality_name ??
    analysisText(properties, "municipality_name", "Milan metropolitan citywide baseline");
  const h3Id =
    selectedCard?.h3_id ?? analysisText(properties, "h3_id", selectedFeature ? "Selected H3 cell" : "Citywide baseline");
  const scope = selectedFeature || selectedCard
    ? `${studyAreaName} / ${h3Id}`
    : "Milan metropolitan citywide baseline";
  const generatedAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const reportPriority = reportCardScore(
    selectedCard,
    "intervention_priority_score",
    priorityScore,
  );
  const reportHotspot = reportCardScore(selectedCard, "hotspot_score", hotspotScore);
  const reportConfidence = reportCardScore(
    selectedCard,
    "data_confidence_score",
    confidenceScore,
  );
  const reportBreakdown = buildReportBreakdownRows(selectedCard, breakdown);
  const dominantDrivers = reportList(
    selectedCard?.dominant_drivers ?? context.diagnosis.dominant_drivers,
    ["PT deficit", "essential services deficit", "social vulnerability", "EO context"],
  );
  const interventionItems = reportList(
    selectedCard?.suggested_intervention_family ??
      context.diagnosis.suggested_intervention_family,
    ["Targeted service improvements", "Local validation before capital works"],
  );
  const validationSteps = reportList(selectedCard?.local_validation_needs, [
    "Validate GTFS/NeTEx route frequency, redundancy and stop access around the hotspot.",
    "Check essential service points against municipal records and recent POI changes.",
    "Review vulnerable population assumptions with updated ISTAT or local demographic data.",
    "Inspect right-of-way, safety, street constraints and stakeholder feedback before sequencing projects.",
  ]);
  const possibleKpis = reportList(selectedCard?.possible_kpis, [
    "Population share within target walking time to frequent public transport.",
    "Average headway and evening or weekend frequency on priority routes.",
    "Essential service categories reachable within the planning threshold.",
    "Reduction of high-priority H3 cells after intervention scenario update.",
  ]);
  const caveats = [
    ...(selectedCard?.caveats ?? []),
    ...(summary?.caveats ?? []),
    ...context.caveats,
  ].filter((item, index, items) => item && items.indexOf(item) === index);
  const priorityClass =
    selectedCard?.classes?.priority_class ??
    selectedCard?.priority_class ??
    context.diagnosis.priority_class;
  const hotspotClass =
    selectedCard?.classes?.hotspot_class ??
    selectedCard?.hotspot_class ??
    context.diagnosis.hotspot_class;
  const confidenceClass =
    selectedCard?.classes?.confidence_class ??
    selectedCard?.confidence_class ??
    "High confidence";
  const typology = selectedCard?.typology ?? context.diagnosis.typology;
  const typologyReason =
    selectedCard?.typology_reason ??
    "Typology is assigned from the dominant score pattern and EO context.";
  const transit = selectedCard?.transit_dependency;
  const eoScore = reportBreakdown.find((item) => item.key === "eo")?.value ?? 0;
  const growthMismatch = reportBreakdown.find((item) => item.key === "growth")?.value ?? 0;
  const hotspotImage = reportAbsoluteUrl(
    reportContext.images?.hotspot ?? "/analysis/images/hotspot_score_h3_res9.png",
  );
  const priorityImage = reportAbsoluteUrl(
    reportContext.images?.interventionPriority ??
      "/analysis/images/intervention_priority_h3_res9.png",
  );
  const priorityRows = reportDistributionRows(
    summary?.priority_class_distribution,
    "priority_class",
  );
  const hotspotRows = reportDistributionRows(
    summary?.hotspot_class_distribution,
    "hotspot_class",
  );
  const typologyRows = reportDistributionRows(
    summary?.typology_distribution,
    "typology",
  ).slice(0, 6);
  const cardParagraph =
    selectedCard?.report_ready_paragraph ??
    `Priority ${Math.round(reportPriority)}/100, hotspot ${Math.round(
      reportHotspot,
    )}/100. Main drivers: ${dominantDrivers.join("; ")}. Typology: ${typology}.`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Milan GIS Analysis Report</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #172033;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f5f7fb;
      }
      main { display: grid; gap: 16px; }
      section {
        background: #fff;
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.07);
      }
      h1 { margin: 0; font-size: 32px; line-height: 1.08; letter-spacing: 0; }
      h2 { margin: 0 0 12px; font-size: 17px; }
      h3 { margin: 0 0 8px; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: .08em; }
      p { margin: 0; color: #64748b; line-height: 1.55; }
      ul { margin: 0; padding-left: 19px; color: #334155; line-height: 1.55; }
      li + li { margin-top: 7px; }
      .cover {
        min-height: 220px;
        display: grid;
        grid-template-columns: 1.3fr .7fr;
        gap: 28px;
        align-items: end;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 45%, #fff1f2 100%);
      }
      .eyebrow { color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      .score {
        justify-self: end;
        width: 176px;
        height: 176px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at center, #fff 57%, transparent 58%),
          conic-gradient(${scoreRiskColor(reportPriority)} ${Math.round(reportPriority)}%, #e5e7eb 0);
      }
      .score strong { display: block; color: ${scoreRiskColor(reportPriority)}; font-size: 48px; line-height: 1; }
      .score span { color: #64748b; font-size: 13px; }
      .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .metric { border-radius: 14px; background: #f8fafc; padding: 14px; }
      .metric b { display: block; margin-top: 6px; font-size: 22px; }
      .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .three-col { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
      .map-plate {
        height: 320px;
        overflow: hidden;
        border-radius: 14px;
        background: #eef2f7;
        position: relative;
      }
      .map-plate img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .map-caption {
        position: absolute;
        left: 14px;
        bottom: 14px;
        z-index: 1;
        border-radius: 12px;
        background: rgba(255,255,255,.86);
        padding: 10px 12px;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(15,23,42,.12);
      }
      .gradient {
        height: 11px;
        border-radius: 999px;
        background: linear-gradient(90deg, #93c5fd, #facc15, #fb923c, #b91c1c);
      }
      .bar-row { display: grid; grid-template-columns: 180px 1fr 52px; gap: 12px; align-items: center; margin: 12px 0; }
      .track { height: 10px; overflow: hidden; border-radius: 999px; background: #eef2f7; }
      .fill { height: 100%; border-radius: 999px; }
      .table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 12px; }
      .table th, .table td { border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; vertical-align: top; }
      .table th { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
      .label { color: #64748b; }
      .recommendations { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .note { border-radius: 14px; background: #f8fafc; padding: 14px; color: #334155; line-height: 1.5; }
      .quote { border-left: 4px solid #2563eb; padding: 12px 14px; background: #f8fafc; color: #334155; border-radius: 10px; }
      .tag {
        display: inline-flex;
        border-radius: 999px;
        background: #fee2e2;
        color: #991b1b;
        font-weight: 700;
        padding: 6px 10px;
        font-size: 12px;
      }
      .small { font-size: 12px; color: #64748b; }
      @media print {
        body { background: #fff; }
        section { box-shadow: none; break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <div>
          <div class="eyebrow">Milan GIS TP-IPT Analysis Report</div>
          <h1>Intervention priority evidence brief</h1>
          <p style="margin-top:16px">Study area: ${escapeHtml(scope)}</p>
          <p>Dataset: ${escapeHtml(summary?.title ?? "TP-IPT decision analysis layer, H3 resolution 9")}</p>
          <p>Generated: ${escapeHtml(generatedAt)}</p>
        </div>
        <div class="score">
          <div>
            <strong>${Math.round(reportPriority)}</strong>
            <span>/100 priority</span>
          </div>
        </div>
      </section>

      <section>
        <h2>1. Study area and executive summary</h2>
        <div class="meta">
          <div class="metric"><span class="label">Priority</span><b>${Math.round(reportPriority)}/100</b><span class="small">${escapeHtml(priorityClass)}</span></div>
          <div class="metric"><span class="label">Hotspot</span><b>${Math.round(reportHotspot)}/100</b><span class="small">${escapeHtml(hotspotClass)}</span></div>
          <div class="metric"><span class="label">Confidence</span><b>${Math.round(reportConfidence)}/100</b><span class="small">${escapeHtml(confidenceClass)}</span></div>
        </div>
        <p style="margin-top:14px">${escapeHtml(cardParagraph)}</p>
        <div class="three-col" style="margin-top:14px">
          <div class="note"><span class="label">H3 cells</span><br><strong>${formatReportNumber(summary?.h3_count ?? ANALYSIS_DASHBOARD_SUMMARY.h3Cells)}</strong></div>
          <div class="note"><span class="label">Hotspot clusters</span><br><strong>${formatReportNumber(summary?.hotspot_cluster_count ?? ANALYSIS_DASHBOARD_SUMMARY.hotspotClusters)}</strong></div>
          <div class="note"><span class="label">High-priority cells</span><br><strong>${formatReportNumber(summary?.high_priority_h3_count ?? ANALYSIS_DASHBOARD_SUMMARY.highPriorityCells)}</strong></div>
        </div>
      </section>

      <section>
        <h2>2. Map of Hotspot Score and 3. Map of Intervention Priority Index</h2>
        <div class="two-col">
          <div>
            <div class="map-plate">
              <img src="${hotspotImage}" alt="Hotspot Score map" />
              <div class="map-caption">Hotspot Score<br><span class="label">${Math.round(reportHotspot)}/100</span></div>
            </div>
            <div class="gradient" style="margin-top:10px"></div>
            <p style="margin-top:8px">Hotspot score highlights where overlapping vulnerability, service deficit and transport poverty signals concentrate.</p>
          </div>
          <div>
            <div class="map-plate">
              <img src="${priorityImage}" alt="Intervention Priority Index map" />
              <div class="map-caption">Intervention Priority Index<br><span class="label">${Math.round(reportPriority)}/100</span></div>
            </div>
            <div class="gradient" style="margin-top:10px"></div>
            <p style="margin-top:8px">The intervention index combines demand, accessibility deficit, service deficit, EO context and confidence.</p>
          </div>
        </div>
      </section>

      <section>
        <h2>4. Top priority cells or clusters</h2>
        <table class="table">
          <thead><tr><th>H3 cell</th><th>Municipality</th><th>Priority</th><th>Hotspot</th><th>Typology and drivers</th></tr></thead>
          <tbody>
            ${topCards
              .map(
                (card) => `<tr>
                  <td>${escapeHtml(card.h3_id ?? "n/a")}</td>
                  <td>${escapeHtml(card.municipality ?? card.municipality_name ?? "Unknown")}</td>
                  <td>${Math.round(reportCardScore(card, "intervention_priority_score", 0))}/100</td>
                  <td>${Math.round(reportCardScore(card, "hotspot_score", 0))}/100</td>
                  <td>${escapeHtml(card.typology ?? "n/a")}<br><span class="small">${escapeHtml(card.dominant_drivers ?? "n/a")}</span></td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>5. Score breakdown</h2>
        ${reportBreakdown
          .map(
            (item) => `<div class="bar-row">
              <span class="label">${escapeHtml(item.label)}</span>
              <div class="track"><div class="fill" style="width:${Math.max(
                0,
                Math.min(100, item.value),
              )}%;background:${item.color}"></div></div>
              <strong>${item.value.toFixed(0)}</strong>
            </div>`,
          )
          .join("")}
      </section>

      <section>
        <h2>6. Dominant drivers</h2>
        <div class="recommendations">
          ${dominantDrivers.map((item) => `<div class="note"><strong>${escapeHtml(item)}</strong></div>`).join("")}
        </div>
        <div class="table" style="margin-top:14px">
          <table class="table">
            <tbody>
              <tr><td class="label">Typology</td><td><strong>${escapeHtml(typology)}</strong></td></tr>
              <tr><td class="label">Typology reason</td><td>${escapeHtml(typologyReason)}</td></tr>
              <tr><td class="label">Priority class</td><td>${escapeHtml(priorityClass)}</td></tr>
              <tr><td class="label">Hotspot class</td><td>${escapeHtml(hotspotClass)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>7. EO territorial interpretation</h2>
        <div class="quote">EO territorial disadvantage score: <strong>${eoScore.toFixed(1)} / 100</strong>. Growth mismatch signal: <strong>${growthMismatch.toFixed(1)} / 100</strong>. This indicator is used as territorial interpretation evidence from night lights, built-up density, artificial land-cover, green/open land-cover and recent change patterns. It supports diagnosis but does not replace local validation.</div>
      </section>

      <section>
        <h2>8. Suggested intervention family</h2>
        <div class="recommendations">
          <div class="note">
            <h3>Intervention family</h3>
            <ul>${interventionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div class="note">
            <h3>GTFS/NeTEx dependency</h3>
            <p>${escapeHtml(transit?.diagnosis ?? context.city2graph.transit_dependency_diagnosis)}</p>
            <p class="small" style="margin-top:8px">Route: ${escapeHtml(transit?.primary_route_line ?? context.city2graph.primary_route_line)}; stop: ${escapeHtml(transit?.primary_stop_id ?? context.city2graph.primary_stop_id)}</p>
            <p class="small" style="margin-top:8px">${escapeHtml(transit?.recommended_gtfs_action ?? context.city2graph.recommended_gtfs_action)}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>9. Data confidence and caveats</h2>
        <span class="tag">Confidence ${Math.round(reportConfidence)}/100</span>
        <ul style="margin-top:14px">
          ${caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section>
        <h2>10. Recommended local validation steps</h2>
        <ul>
          ${validationSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section>
        <h2>11. Possible KPIs</h2>
        <ul>
          ${possibleKpis.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <section>
        <h2>Appendix. Citywide distributions</h2>
        <div class="two-col">
          <div>
            <h3>Priority classes</h3>
            ${reportDistributionHtml(priorityRows)}
          </div>
          <div>
            <h3>Hotspot classes</h3>
            ${reportDistributionHtml(hotspotRows)}
          </div>
        </div>
        <h3 style="margin-top:18px">Typology distribution</h3>
        ${reportDistributionHtml(typologyRows)}
      </section>
    </main>
  </body>
</html>`;
}

function reportCardScore(
  card: AnalysisReportCard | null,
  key: string,
  fallback: number,
) {
  const direct = card ? (card as Record<string, unknown>)[key] : null;
  const score = card?.scores?.[key] ?? direct;

  return typeof score === "number" && Number.isFinite(score) ? score : fallback;
}

function reportBreakdownValue(
  card: AnalysisReportCard | null,
  cardKey: string,
  fallback: number,
) {
  const value = card?.score_breakdown?.[cardKey];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildReportBreakdownRows(
  card: AnalysisReportCard | null,
  fallbackBreakdown: Array<{ label: string; value: number; color: string }>,
) {
  const fallbackByLabel = new Map(
    fallbackBreakdown.map((item) => [item.label, item.value]),
  );

  return [
    {
      key: "social",
      label: "Social vulnerability",
      value: reportBreakdownValue(
        card,
        "social_vulnerability",
        fallbackByLabel.get("Social vulnerability") ?? 0,
      ),
      color: "#f97316",
    },
    {
      key: "pt",
      label: "Public transport deficit",
      value: reportBreakdownValue(
        card,
        "public_transport_deficit",
        fallbackByLabel.get("PTAL deficit") ?? 0,
      ),
      color: "#2563eb",
    },
    {
      key: "services",
      label: "Essential services deficit",
      value: reportBreakdownValue(
        card,
        "essential_services_deficit",
        fallbackByLabel.get("Essential services deficit") ?? 0,
      ),
      color: "#10b981",
    },
    {
      key: "eo",
      label: "EO territorial disadvantage",
      value: reportBreakdownValue(
        card,
        "eo_territorial_disadvantage",
        fallbackByLabel.get("EO territorial disadvantage") ?? 0,
      ),
      color: "#8b5cf6",
    },
    {
      key: "confidence",
      label: "Data confidence",
      value: reportCardScore(card, "data_confidence_score", fallbackByLabel.get("Data confidence") ?? 0),
      color: "#0f766e",
    },
    {
      key: "growth",
      label: "Growth mismatch",
      value: reportBreakdownValue(card, "growth_mismatch", 0),
      color: "#64748b",
    },
  ];
}

function reportList(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : fallback;
  }

  const items = String(value ?? "")
    .split(/(?:;|\n|\. )\s*/)
    .map((item) => item.trim().replace(/[.;]$/, ""))
    .filter(Boolean);

  return items.length ? items : fallback;
}

function reportAbsoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;

  return new URL(pathOrUrl, window.location.origin).toString();
}

function formatReportNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? Math.round(numberValue).toLocaleString()
    : "n/a";
}

function reportDistributionRows(
  rows: Array<Record<string, string | number>> | undefined,
  labelKey: string,
) {
  return (rows ?? []).map((row) => ({
    label: String(row[labelKey] ?? "Unknown"),
    count: Number(row.h3_count ?? 0),
    percent: Number(row.percent ?? 0),
  }));
}

function reportDistributionHtml(
  rows: Array<{ label: string; count: number; percent: number }>,
) {
  if (!rows.length) return `<p class="small">No distribution data available.</p>`;

  return rows
    .map(
      (row) => `<div class="bar-row">
        <span class="label">${escapeHtml(row.label)}</span>
        <div class="track"><div class="fill" style="width:${Math.max(
          0,
          Math.min(100, row.percent),
        )}%;background:#64748b"></div></div>
        <strong>${row.percent.toFixed(1)}%</strong>
      </div>`,
    )
    .join("");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MilanMapCanvas({
  theme,
  groups,
  activeFunction,
  activeLayers,
  activeLayerIds,
  opacities,
  basemap,
  llmSettings,
  layerPanelOpen,
  detailOpen,
  selectedLayer,
  selectedFeature,
  onLayerPanelOpenChange,
  onSelectLayer,
  onInspectLayer,
  onOpacityChange,
  onBasemapChange,
  onFeatureSelect,
  onCloseDetail,
}: {
  theme: ThemeMode;
  groups: MilanLayerGroup[];
  activeFunction: PrimaryFunction;
  activeLayers: PublicMilanLayer[];
  activeLayerIds: Set<string>;
  opacities: Record<string, number>;
  basemap: BasemapId;
  llmSettings: LlmSettings;
  layerPanelOpen: boolean;
  detailOpen: boolean;
  selectedLayer: PublicMilanLayer | null;
  selectedFeature: SelectedFeature | null;
  onLayerPanelOpenChange: (value: boolean) => void;
  onSelectLayer: (id: string) => void;
  onInspectLayer: (layer: PublicMilanLayer) => void;
  onOpacityChange: (id: string, value: number) => void;
  onBasemapChange: (id: BasemapId) => void;
  onFeatureSelect: (feature: SelectedFeature) => void;
  onCloseDetail: () => void;
}) {
  const activeLayer = activeLayers[0] ?? null;
  const isAnalysisDashboard =
    activeFunction.id === "ai-agent" && activeLayerIds.has("analysis-dashboard");
  const isVulnerabilityMode = activeFunction.id === "vulnerability";
  const shouldShowBoundary =
    activeFunction.id === "ai-agent" ||
    activeFunction.id === "vulnerability" ||
    activeFunction.id === "ptal" ||
    activeFunction.id === "earth-observation";
  const contextLayers = shouldShowBoundary
    ? (groups.find((group) => group.id === "context")?.layers ?? []).filter(
        (layer) => layer.id === "context-boundary-citta-metropolitana-milano",
      )
    : [];

  if (isAnalysisDashboard) {
    return (
      <AnalysisDashboard
        groups={groups}
        theme={theme}
        llmSettings={llmSettings}
      />
    );
  }

  return (
    <div className="relative h-full min-w-0 bg-background">
      <VulnerabilityFigureTitle layer={activeLayer} />
      <MapLegend activeFunction={activeFunction} activeLayer={activeLayer} />
      <LayerTreeControl
        open={layerPanelOpen}
        groups={groups}
        activeFunction={activeFunction}
        activeLayerIds={activeLayerIds}
        opacities={opacities}
        basemap={basemap}
        detailOpen={detailOpen}
        onOpenChange={onLayerPanelOpenChange}
        onSelectLayer={onSelectLayer}
        onInspectLayer={onInspectLayer}
        onOpacityChange={onOpacityChange}
        onBasemapChange={onBasemapChange}
      />
      <DetailInspector
        open={detailOpen}
        selectedLayer={selectedLayer}
        selectedFeature={selectedFeature}
        onClose={onCloseDetail}
      />
      <GeoMap
        key={`${theme}-${basemap}`}
        theme={theme}
        center={[9.19, 45.47]}
        zoom={9.2}
        minZoom={7}
        maxZoom={16}
        pitch={isVulnerabilityMode ? 0 : 20}
        styles={BASEMAP_STYLES[basemap]}
      >
        {activeLayers.map((layer) => (
          <GeoJsonLayer
            key={layer.id}
            layer={layer}
            opacity={layerOpacity(layer, opacities)}
            material="default"
            contrast={1}
            onFeatureSelect={onFeatureSelect}
          />
        ))}
        {contextLayers.map((layer) => (
          <GeoJsonLayer
            key={layer.id}
            layer={layer}
            opacity={layerOpacity(layer, opacities)}
            material="default"
            contrast={1}
            onFeatureSelect={onFeatureSelect}
          />
        ))}
      </GeoMap>
    </div>
  );
}

export function MilanLayerViewer({ groups }: MilanLayerViewerProps) {
  const layers = React.useMemo(
    () => groups.flatMap((group) => group.layers),
    [groups],
  );

  const [theme, setTheme] = React.useState<ThemeMode>("light");
  const [basemap, setBasemap] = React.useState<BasemapId>("current");
  const [railExpanded, setRailExpanded] = React.useState(true);
  const [layerPanelOpen, setLayerPanelOpen] = React.useState(false);
  const [activeFunctionId, setActiveFunctionId] =
    React.useState<PrimaryFunctionId>("ai-agent");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(
    null,
  );
  const [selectedFeature, setSelectedFeature] =
    React.useState<SelectedFeature | null>(null);
  const [opacities, setOpacities] = React.useState<Record<string, number>>({});
  const [llmSettings, setLlmSettingsState] = React.useState<LlmSettings>(
    readStoredLlmSettings,
  );
  const [activeLayerIds, setActiveLayerIds] = React.useState<Set<string>>(
    () => defaultActiveLayersForFunction("ai-agent"),
  );

  const activeFunction =
    PRIMARY_FUNCTIONS.find((item) => item.id === activeFunctionId) ??
    PRIMARY_FUNCTIONS[0];
  const activeLayers = React.useMemo(
    () => layers.filter((layer) => activeLayerIds.has(layer.id)),
    [activeLayerIds, layers],
  );
  const selectedLayer = React.useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  );

  const selectLayer = React.useCallback((id: string) => {
    setActiveLayerIds(new Set([id]));
    setSelectedLayerId(null);
    setSelectedFeature(null);
    setDetailOpen(false);
  }, []);

  const inspectLayer = React.useCallback((layer: PublicMilanLayer) => {
    setSelectedLayerId(layer.id);
    setSelectedFeature(null);
    setDetailOpen(true);
  }, []);

  const inspectFeature = React.useCallback((feature: SelectedFeature) => {
    setSelectedLayerId(feature.layer.id);
    setSelectedFeature(feature);
    setDetailOpen(true);
  }, []);

  const selectFunction = React.useCallback((id: PrimaryFunctionId) => {
    setActiveFunctionId(id);
    setSelectedLayerId(null);
    setSelectedFeature(null);
    setDetailOpen(false);
    if (id === "earth-observation") {
      setBasemap("satellite");
    }
    setActiveLayerIds(defaultActiveLayersForFunction(id));
  }, []);

  const changeOpacity = React.useCallback((id: string, value: number) => {
    setOpacities((current) => ({ ...current, [id]: value }));
  }, []);

  const changeLlmSettings = React.useCallback((settings: LlmSettings) => {
    const normalizedSettings = normalizeLlmSettings(settings);
    setLlmSettingsState(normalizedSettings);

    try {
      window.localStorage.setItem(
        LLM_SETTINGS_STORAGE_KEY,
        JSON.stringify(normalizedSettings),
      );
    } catch {
      // Ignore local storage failures in privacy modes.
    }
  }, []);

  return (
    <div
      className={cn(
        "h-svh w-full overflow-hidden bg-background text-foreground",
        theme === "dark" && "dark",
      )}
    >
      <SidebarProvider
        open={railExpanded}
        onOpenChange={setRailExpanded}
        className="h-full min-h-0"
      >
        <AppSidebar
          activeId={activeFunctionId}
          activeLayerId={Array.from(activeLayerIds)[0] ?? null}
          theme={theme}
          llmSettings={llmSettings}
          onFunctionSelect={selectFunction}
          onLayerSelect={selectLayer}
          onThemeChange={setTheme}
          onLlmSettingsChange={changeLlmSettings}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          <MainDirectoryHeader activeFunction={activeFunction} />
          <div className="min-h-0 flex-1">
            <MilanMapCanvas
              theme={theme}
              groups={groups}
              activeFunction={activeFunction}
              activeLayers={activeLayers}
              activeLayerIds={activeLayerIds}
              opacities={opacities}
              basemap={basemap}
              llmSettings={llmSettings}
              layerPanelOpen={layerPanelOpen}
              detailOpen={detailOpen}
              selectedLayer={selectedLayer}
              selectedFeature={selectedFeature}
              onLayerPanelOpenChange={setLayerPanelOpen}
              onSelectLayer={selectLayer}
              onInspectLayer={inspectLayer}
              onOpacityChange={changeOpacity}
              onBasemapChange={setBasemap}
              onFeatureSelect={inspectFeature}
              onCloseDetail={() => setDetailOpen(false)}
            />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
