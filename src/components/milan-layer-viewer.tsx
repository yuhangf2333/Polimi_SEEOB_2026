"use client";

import * as React from "react";
import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
  StyleSpecification,
} from "maplibre-gl";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  DatabaseZap,
  FileText,
  HandHeart,
  Lightbulb,
  Maximize2,
  Satellite,
  SendHorizontal,
  TramFront,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Map as GeoMap, useMap } from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_LLM_SETTINGS,
  LLM_PROVIDER_PRESETS,
  type LlmSettings,
} from "@/lib/llm-settings";
import { parseChatMarkdown, type ChatMarkdownBlock } from "@/lib/chat-markdown";
import {
  normalizeFormulaText,
  tokenizeFormulaText,
} from "@/lib/formula-rendering.mjs";
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
  contextLayers?: PublicMilanLayer[];
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
  featureId: string | number | null;
  properties: GeoJSON.GeoJsonProperties;
  coordinate: [number, number];
};

type FeatureDetailMode = "overview" | "advanced";
type AnalysisPanelMode = "summary" | "chat";
type ChatMarkdownTableBlock = Extract<ChatMarkdownBlock, { type: "table" }>;
type FormulaToken = { type: "text" | "sub" | "sup"; text: string };

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

type AnalysisPresetQuestion = {
  label: string;
  prompt: string;
};

type AnalysisPresetCategory = {
  id: string;
  label: string;
  questions: AnalysisPresetQuestion[];
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
const LARGE_SURFACE_TILE_BUFFER = 32;

const DEFAULT_VISIBLE_LAYER_IDS: Record<PrimaryFunctionId, string[]> = {
  ptal: ["ptal-public-transport-deficit"],
  services: ["services-essential-service-deficit"],
  vulnerability: ["vulnerability-index"],
  "earth-observation": ["earth-observation-territorial-disadvantage"],
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
    description: "Social Vulnerability Index and transport poverty signals.",
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
    "Public Transport Deficit",
    "Stop access, frequency, line availability and hub access",
    "PTA and PTAL/PTOL components",
  ],
  services: [
    "Essential Services Deficit",
    "Healthcare, school, job and grocery access",
    "ESA and VSEG components",
  ],
  vulnerability: [
    "Social Vulnerability Index",
    "Elderly, labour, education and citizenship components",
    "Income and low-car-access components",
  ],
  "earth-observation": [
    "EO-Territorial Disadvantage Index",
    "Structural isolation",
    "Dispersed settlement pressure",
    "Growth pressure",
    "Demand and settlement intensity",
  ],
  "ai-agent": [
    "Dashboard",
    "Intervention priority",
    "Hotspot score",
    "Data confidence",
    "Typology",
  ],
};

const PUBLIC_TRANSPORT_CONTINUOUS_LEGENDS: Record<
  string,
  ContinuousLegendConfig
> = {
  "ptal-public-transport-accessibility": {
    label: "Public transport accessibility",
    stops: [
      [0, "#eff6ff"],
      [0.25, "#bfdbfe"],
      [0.5, "#60a5fa"],
      [0.75, "#2563eb"],
      [1, "#1e3a8a"],
    ],
  },
  "ptal-public-transport-deficit": {
    label: "Public transport deficit",
    stops: [
      [0, "#e0f2fe"],
      [0.25, "#93c5fd"],
      [0.5, "#3b82f6"],
      [0.75, "#1d4ed8"],
      [1, "#1e3a8a"],
    ],
  },
  "ptal-service-frequency": {
    label: "Service frequency",
    stops: [
      [0, "#eff6ff"],
      [0.25, "#bfdbfe"],
      [0.5, "#60a5fa"],
      [0.75, "#2563eb"],
      [1, "#1e3a8a"],
    ],
  },
  "ptal-line-availability": {
    label: "Line availability",
    stops: [
      [0, "#eff6ff"],
      [0.25, "#bfdbfe"],
      [0.5, "#60a5fa"],
      [0.75, "#2563eb"],
      [1, "#1e3a8a"],
    ],
  },
  "ptal-ptal-ptol-component": {
    label: "PTAL/PTOL component",
    stops: [
      [0, "#eff6ff"],
      [0.25, "#bfdbfe"],
      [0.5, "#60a5fa"],
      [0.75, "#2563eb"],
      [1, "#1e3a8a"],
    ],
  },
};

const PUBLIC_TRANSPORT_CATEGORY_LEGENDS: Record<
  string,
  CategoricalLegendConfig
> = {
  "ptal-ptal-component": {
    label: "Public Transport Accessibility Level (PTAL)",
    property: "PTAL_component",
    classes: [
      { value: "0", label: "0", color: "#f1f5f9", max: 0 },
      { value: "1a", label: "1a", color: "#71879d", max: 0.125 },
      { value: "1b", label: "1b", color: "#55a5c0", max: 0.25 },
      { value: "2", label: "2", color: "#39a9be", max: 0.375 },
      { value: "3", label: "3", color: "#a6d96a", max: 0.5 },
      { value: "4", label: "4", color: "#f2e42d", max: 0.625 },
      { value: "5", label: "5", color: "#edb06b", max: 0.75 },
      { value: "6a", label: "6a", color: "#dc5f6b", max: 0.875 },
      { value: "6b", label: "6b", color: "#a9505c" },
    ],
  },
  "ptal-ptal-detailed": {
    label: "Public Transport Accessibility Level (PTAL, 250m)",
    property: "ptal_order",
    classes: [
      { value: "0", label: "0", color: "#f1f5f9", max: 0 },
      { value: "1a", label: "1a", color: "#71879d", max: 1 },
      { value: "1b", label: "1b", color: "#55a5c0", max: 2 },
      { value: "2", label: "2", color: "#39a9be", max: 3 },
      { value: "3", label: "3", color: "#a6d96a", max: 4 },
      { value: "4", label: "4", color: "#f2e42d", max: 5 },
      { value: "5", label: "5", color: "#edb06b", max: 6 },
      { value: "6a", label: "6a", color: "#dc5f6b", max: 7 },
      { value: "6b", label: "6b", color: "#a9505c" },
    ],
  },
  "ptal-ptal-100m-gtfs-netex": {
    label: "Public Transport Accessibility Level (PTAL, 100m GTFS/NeTEx)",
    property: "ptal",
    classes: [
      { value: "0", label: "0", color: "#f1f5f9" },
      { value: "1a", label: "1a", color: "#71879d" },
      { value: "1b", label: "1b", color: "#55a5c0" },
      { value: "2", label: "2", color: "#39a9be" },
      { value: "3", label: "3", color: "#a6d96a" },
      { value: "4", label: "4", color: "#f2e42d" },
      { value: "5", label: "5", color: "#edb06b" },
      { value: "6a", label: "6a", color: "#dc5f6b" },
      { value: "6b", label: "6b", color: "#a9505c" },
    ],
  },
  "ptal-ptol-component": {
    label: "Public Transport Opportunity Level (PTOL)",
    property: "PTOL_component",
    classes: [
      { value: "0", label: "0", color: "#e6eef5", max: 0 },
      { value: "1", label: "1", color: "#8fc5e2", max: 0.25 },
      { value: "2", label: "2", color: "#3f98cf", max: 0.5 },
      { value: "3", label: "3", color: "#0f6faa", max: 0.75 },
      { value: "4", label: "4", color: "#123f7d" },
    ],
  },
  "ptal-ptol-detailed": {
    label: "Public Transport Opportunity Level (PTOL, 250m)",
    property: "ptol",
    classes: [
      { value: "0", label: "0", color: "#e6eef5", max: 0 },
      { value: "1", label: "1", color: "#8fc5e2", max: 1 },
      { value: "2", label: "2", color: "#3f98cf", max: 2 },
      { value: "3", label: "3", color: "#0f6faa", max: 3 },
      { value: "4", label: "4", color: "#123f7d" },
    ],
  },
  "ptal-ptol-100m-gtfs-netex": {
    label: "Public Transport Opportunity Level (PTOL, 100m GTFS/NeTEx)",
    property: "ptol",
    classes: [
      { value: "0", label: "0", color: "#e6eef5" },
      { value: "1", label: "1", color: "#8fc5e2" },
      { value: "2", label: "2", color: "#3f98cf" },
      { value: "3", label: "3", color: "#0f6faa" },
      { value: "4", label: "4", color: "#123f7d" },
    ],
  },
};

const STOP_MODE_CLASSES = [
  { value: "bus", label: "Bus", color: "#2563eb" },
  { value: "tram", label: "Tram", color: "#dc2626" },
  { value: "metro", label: "Metro", color: "#7c3aed" },
  { value: "rail", label: "Rail", color: "#0f766e" },
];

const SERVICE_POINT_CLASSES = [
  { value: "healthcare_structure", label: "Healthcare", color: "#dc2626" },
  { value: "pharmacy", label: "Pharmacy", color: "#f97316" },
  { value: "school", label: "School", color: "#2563eb" },
  { value: "official_food_retail", label: "Official food retail", color: "#16a34a" },
  { value: "osm_grocery", label: "Grocery", color: "#84cc16" },
];

const SERVICE_CONTINUOUS_LEGENDS: Record<string, ContinuousLegendConfig> = {
  "services-essential-services-accessibility": {
    label: "Essential services accessibility",
    stops: [
      [0, "#fee2e2"],
      [0.25, "#fdba74"],
      [0.5, "#fde047"],
      [0.75, "#86efac"],
      [1, "#15803d"],
    ],
  },
  "services-essential-service-deficit": {
    label: "Essential services deficit",
    stops: [
      [0, "#ecfdf5"],
      [0.25, "#86efac"],
      [0.5, "#facc15"],
      [0.75, "#fb923c"],
      [1, "#b91c1c"],
    ],
  },
  "services-health-access": {
    label: "Health access",
    stops: [
      [0, "#fee2e2"],
      [0.25, "#fdba74"],
      [0.5, "#fde047"],
      [0.75, "#86efac"],
      [1, "#15803d"],
    ],
  },
  "services-school-access": {
    label: "School access",
    stops: [
      [0, "#fee2e2"],
      [0.25, "#fdba74"],
      [0.5, "#fde047"],
      [0.75, "#86efac"],
      [1, "#15803d"],
    ],
  },
  "services-job-access": {
    label: "Job access",
    stops: [
      [0, "#fee2e2"],
      [0.25, "#fdba74"],
      [0.5, "#fde047"],
      [0.75, "#86efac"],
      [1, "#15803d"],
    ],
  },
  "services-grocery-access": {
    label: "Grocery access",
    stops: [
      [0, "#fee2e2"],
      [0.25, "#fdba74"],
      [0.5, "#fde047"],
      [0.75, "#86efac"],
      [1, "#15803d"],
    ],
  },
};

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
  { value: "Dense Underserved Fringe", label: "Dense underserved fringe", color: "#b91c1c" },
  { value: "Dispersed Rural Fragility", label: "Dispersed rural fragility", color: "#a16207" },
  { value: "Growth-Transport Mismatch", label: "Growth-transport mismatch", color: "#c2410c" },
  { value: "Active but Disconnected", label: "Active disconnected", color: "#7c3aed" },
  { value: "Essential-Services Desert", label: "Service desert", color: "#db2777" },
  { value: "Mixed or lower-priority pattern", label: "Mixed/lower priority", color: "#cbd5e1" },
];

type ContinuousLegendConfig = {
  label: string;
  stops: Array<[number, string]>;
  max?: number;
};

type CategoricalLegendClass = {
  value: string;
  label: string;
  color: string;
  max?: number;
};

type CategoricalLegendConfig = {
  label: string;
  property: string;
  classes: CategoricalLegendClass[];
};

const EO_CONTINUOUS_LEGENDS: Record<string, ContinuousLegendConfig> = {
  "earth-observation-territorial-disadvantage": {
    label: "EO territorial disadvantage",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-population-demand": {
    label: "Population demand",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-built-up-density": {
    label: "Built-up density",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-artificial-land-cover": {
    label: "Artificial land cover",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-artificial-land-cover-100m": {
    label: "Artificial land cover share",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-nighttime-lights": {
    label: "Nighttime lights",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-nighttime-lights-100m": {
    label: "Nighttime lights score",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-road-density": {
    label: "Road density",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-intersection-density": {
    label: "Intersection density",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-road-connectivity": {
    label: "Road connectivity",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
    ],
  },
  "earth-observation-green-land": {
    label: "Green land",
    stops: [
      [0, "#f7fee7"],
      [0.25, "#bef264"],
      [0.5, "#65a30d"],
      [0.75, "#3f6212"],
      [1, "#1a2e05"],
    ],
  },
  "earth-observation-urban-growth": {
    label: "Urban growth",
    stops: [
      [0, "#f5f3ff"],
      [0.25, "#c4b5fd"],
      [0.5, "#8b5cf6"],
      [0.75, "#6d28d9"],
      [1, "#3b0764"],
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
};

const ANALYSIS_DASHBOARD_SUMMARY = {
  meanPriority: 51.3,
  meanHotspot: 56.7,
  meanConfidence: 89.3,
  highPriorityCells: 2241,
  hotspotClusters: 0,
  h3Cells: 15547,
  distribution: {
    low: 45.5,
    medium: 40.1,
    high: 14.4,
  },
  breakdown: [
    {
      key: "svi_score",
      label: "Social Vulnerability Index",
      value: 39.7,
      color: "#f97316",
    },
    {
      key: "pt_deficit_score",
      label: "Public Transport Deficit",
      value: 65.5,
      color: "#2563eb",
    },
    {
      key: "essential_services_deficit_score",
      label: "Essential Services Deficit",
      value: 62.3,
      color: "#10b981",
    },
    {
      key: "eo_territorial_disadvantage_score",
      label: "EO-Territorial Disadvantage Index",
      value: 48.2,
      color: "#8b5cf6",
    },
    {
      key: "data_confidence_score",
      label: "Data confidence",
      value: 89.3,
      color: "#0f766e",
    },
  ],
  scenarios: [
    { label: "Equity first", value: 39.7 },
    { label: "Service access first", value: 62.3 },
    { label: "Mobility network first", value: 65.5 },
    { label: "Growth mismatch", value: 48.2 },
  ],
};

const ANALYSIS_PRESET_CATEGORIES = [
  {
    id: "priority",
    label: "Priority",
    questions: [
      {
        label: "Why is this area high priority?",
        prompt:
          "What makes this area high priority? Use the selected priority score, hotspot score, score breakdown, typology, dominant drivers, and data confidence.",
      },
      {
        label: "Transport or service gap?",
        prompt:
          "Is this more a transport gap or a service gap? Compare Public Transport Deficit and Essential Services Deficit in a compact table.",
      },
      {
        label: "Which score driver matters most?",
        prompt:
          "Which score driver matters most here? Rank the current score breakdown and explain the planning meaning.",
      },
      {
        label: "Explain this hotspot for planners.",
        prompt:
          "Explain this hotspot for planners. Keep it practical and grounded in the selected scores, typology, and caveats.",
      },
    ],
  },
  {
    id: "access",
    label: "Access",
    questions: [
      {
        label: "Which stops and routes matter?",
        prompt:
          "Which stops and routes matter here? Use route and stop dependency evidence when available.",
      },
      {
        label: "Which services are hardest to reach?",
        prompt:
          "Which essential services are hardest to reach here? Use nearest healthcare, pharmacy, school, food retail, grocery, and walking-distance evidence when available.",
      },
      {
        label: "Distance or connection problem?",
        prompt:
          "Is access limited more by distance or by network connections? Compare service distance, PTAL distance, walking-network distance, detour ratios, and mismatch evidence.",
      },
      {
        label: "What access pattern stands out?",
        prompt:
          "What nearby access pattern stands out? Summarize the most important service, stop, route, and walking-network relationships.",
      },
    ],
  },
  {
    id: "equity",
    label: "Equity",
    questions: [
      {
        label: "How does vulnerability affect priority?",
        prompt:
          "How does Social Vulnerability Index affect this area's priority? Use the vulnerability score and explain how it interacts with access deficits.",
      },
      {
        label: "Does vulnerability overlap with gaps?",
        prompt:
          "Does Social Vulnerability Index overlap with access gaps here? Compare Social Vulnerability Index, Public Transport Deficit, and Essential Services Deficit.",
      },
      {
        label: "Is this an equity-first hotspot?",
        prompt:
          "Should this be treated as an equity-first hotspot? Ground the answer in vulnerability, accessibility deficits, priority class, and data confidence.",
      },
      {
        label: "Which score shows local need?",
        prompt:
          "Which score best signals local need intensity here? Compare the score breakdown and explain the strongest equity-relevant evidence.",
      },
    ],
  },
  {
    id: "action",
    label: "Action",
    questions: [
      {
        label: "What should be done first here?",
        prompt:
          "What should be done first here? Recommend the first planning action using dominant drivers, suggested intervention family, and transit dependency evidence.",
      },
      {
        label: "Give me a priority action table.",
        prompt:
          "Give me a priority action table for this hotspot. Include action, evidence basis, expected benefit, caveat, and next check.",
      },
      {
        label: "What quick wins fit this hotspot?",
        prompt:
          "What quick wins fit this hotspot? Focus on realistic service, stop, route, feeder access, and walking-network improvements supported by the evidence.",
      },
      {
        label: "Which intervention type fits best?",
        prompt:
          "Which intervention type fits best here? Use the suggested intervention family, dominant drivers, score breakdown, and transit dependency evidence.",
      },
    ],
  },
  {
    id: "data",
    label: "Data",
    questions: [
      {
        label: "Where do these data come from?",
        prompt:
          "Where do the dashboard data come from? Answer simply by source family: social vulnerability, public transport, essential services, earth observation, route/stop dependency evidence, and boundary/grid processing. Include the main caveat for each family.",
      },
      {
        label: "How should I use these data?",
        prompt:
          "How should these data be used in planning? Explain what they are good for, what must be locally validated, and which variables are proxies rather than direct observations.",
      },
      {
        label: "How are the scores calculated?",
        prompt:
          "How are the main dashboard scores calculated? Summarize SVI, PTD, ESD, EOTD, TPHS, intervention_priority_formula_score, intervention_priority_score, and DCS using markdown display math.",
      },
      {
        label: "What should be validated first?",
        prompt:
          "What data should be validated first before using these results for intervention planning? Prioritize transit feeds, service points, vulnerability inputs, EO proxies, and route/stop dependency plus walking-network evidence.",
      },
    ],
  },
] satisfies AnalysisPresetCategory[];

function publicTransportContinuousLegend(layer: PublicMilanLayer) {
  return PUBLIC_TRANSPORT_CONTINUOUS_LEGENDS[layer.id] ?? null;
}

function publicTransportCategoryLegend(layer: PublicMilanLayer) {
  return PUBLIC_TRANSPORT_CATEGORY_LEGENDS[layer.id] ?? null;
}

function categoricalLegendColorExpression(legend: CategoricalLegendConfig) {
  if (legend.classes.every((item) => item.max === undefined)) {
    return [
      "match",
      ["to-string", ["get", legend.property]],
      ...legend.classes.flatMap((item) => [item.value, item.color]),
      VULNERABILITY_NO_DATA_COLOR,
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
  }

  const valueExpression = ["to-number", ["get", legend.property], -1];
  const thresholds = legend.classes.flatMap((item) =>
    item.max === undefined ? [] : [["<=", valueExpression, item.max], item.color],
  );
  const fallbackColor =
    legend.classes[legend.classes.length - 1]?.color ?? VULNERABILITY_NO_DATA_COLOR;

  return [
    "case",
    ["<", valueExpression, 0],
    VULNERABILITY_NO_DATA_COLOR,
    ...thresholds,
    fallbackColor,
  ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
}

function publicTransportCategoryColor(layer: PublicMilanLayer) {
  const legend = publicTransportCategoryLegend(layer);
  if (!legend) return null;

  return categoricalLegendColorExpression(legend);
}

function publicTransportLayerColor(
  layer: PublicMilanLayer,
  material: LayerMaterial,
) {
  const categoryColor = publicTransportCategoryColor(layer);
  if (categoryColor) return categoryColor;

  const continuousLegend = publicTransportContinuousLegend(layer);

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

  return layerMaterialColor(layer, material);
}

function stopModeClasses(layer: PublicMilanLayer) {
  return layer.id === "ptal-stops-all" ? STOP_MODE_CLASSES : null;
}

function servicePointClasses(layer: PublicMilanLayer) {
  return layer.id === "services-points-all" ? SERVICE_POINT_CLASSES : null;
}

function pointLayerColor(layer: PublicMilanLayer, fallbackColor: string) {
  const stopClasses = stopModeClasses(layer);
  if (stopClasses) {
    return [
      "match",
      ["to-string", ["get", "dominant_mode"]],
      ...stopClasses.flatMap((item) => [item.value, item.color]),
      fallbackColor,
    ] as unknown as NonNullable<CircleLayerSpecification["paint"]>["circle-color"];
  }

  const serviceClasses = servicePointClasses(layer);
  if (serviceClasses) {
    return [
      "match",
      ["to-string", ["get", "category"]],
      ...serviceClasses.flatMap((item) => [item.value, item.color]),
      fallbackColor,
    ] as unknown as NonNullable<CircleLayerSpecification["paint"]>["circle-color"];
  }

  return fallbackColor;
}

function serviceContinuousLegend(layer: PublicMilanLayer) {
  return SERVICE_CONTINUOUS_LEGENDS[layer.id] ?? null;
}

function serviceContinuousColor(layer: PublicMilanLayer) {
  const legend = serviceContinuousLegend(layer);
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

function serviceClassColor(layer: PublicMilanLayer) {
  return serviceContinuousColor(layer);
}

function serviceFillOpacity(
  layer: PublicMilanLayer,
  effectiveOpacity: number,
) {
  return effectiveOpacity;
}

function analysisContinuousLegend(layer: PublicMilanLayer) {
  return ANALYSIS_CONTINUOUS_LEGENDS[layer.id] ?? null;
}

function analysisCategoryClasses(layer: PublicMilanLayer) {
  if (layer.id === "analysis-typology") {
    return ANALYSIS_TYPOLOGY_CLASSES;
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
  return effectiveOpacity;
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

function publicTransportCategoricalColorFromValue(
  layer: PublicMilanLayer,
  value: unknown,
) {
  const legend = publicTransportCategoryLegend(layer);
  if (!legend) return null;

  if (legend.classes.every((item) => item.max === undefined)) {
    const valueText = String(value ?? "");

    return legend.classes.find((item) => item.value === valueText)?.color ?? null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;

  return (
    legend.classes.find((item) => item.max !== undefined && numericValue <= item.max)
      ?.color ??
    legend.classes[legend.classes.length - 1]?.color ??
    null
  );
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
  teal: ["#e0f2f1", "#5fb7ad", "#0f766e"],
  indigo: ["#e0e7ff", "#818cf8", "#4338ca"],
};

const VULNERABILITY_GRAYSCALE = ["#f4f4f5", "#a1a1aa", "#3f3f46"];
const VULNERABILITY_DARK = ["#27272a", "#71717a", "#f4f4f5"];
const VULNERABILITY_NO_DATA_COLOR = "#d9d9d9";

const VULNERABILITY_FIGURE_COPY: Record<
  string,
  { title: string; subtitle: string; note: string }
> = {
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
    ["<=", ["to-number", ["get", "total_ghsl_population_count"], -1], 0],
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

  const rankProperty = layer.thematicRankProperty ?? null;
  if (!rankProperty && layer.thematicProperty) {
    const valueExpression = ["to-number", ["get", layer.thematicProperty], -1];

    return [
      "case",
      vulnerabilityNoDataExpression(),
      VULNERABILITY_NO_DATA_COLOR,
      ["<", valueExpression, 1 / 3],
      palette[0],
      ["<", valueExpression, 2 / 3],
      palette[1],
      palette[2],
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-color"];
  }

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

  const rankProperty = layer.thematicRankProperty ?? null;
  if (!rankProperty && layer.thematicProperty) {
    return [
      "case",
      vulnerabilityNoDataExpression(),
      noDataOpacity,
      effectiveOpacity,
    ] as unknown as NonNullable<FillLayerSpecification["paint"]>["fill-opacity"];
  }

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
  ptal_order: "PTAL order",
  ptol: "PTOL value",
  ptol_mean: "PTOL mean",
  ptol_modes: "PTOL modes",
  total_ghsl_population_count: "GHSL population",
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
  category: "Category",
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
  SVI: "Social Vulnerability Index",
  Elderly: "Elderly component",
  Labour: "Labour component",
  Education: "Education component",
  Citizenship: "Citizenship component",
  Income: "Income component",
  Motorisation: "Motorisation component",
  LowCarAccess: "Low-car-access component",
  PTA: "Public Transport Accessibility",
  PTD: "Public Transport Deficit",
  SA: "Stop access",
  FR: "Frequency",
  LA: "Line availability",
  HA: "Hub access",
  PTAL_component: "PTAL component",
  PTOL_component: "PTOL component",
  PTAL_PTOL: "PTAL/PTOL component",
  ESA: "Essential Services Accessibility",
  ESD: "Essential Services Deficit",
  HealthAccess: "Healthcare access",
  SchoolAccess: "School access",
  JobAccess: "Job access",
  GroceryAccess: "Grocery access",
  VSEG: "Vulnerability-service gap",
  EOTD: "EO-Territorial Disadvantage",
  P: "Population demand",
  B: "Built-up density",
  A: "Artificial land cover",
  L: "Nighttime lights",
  M: "Population mask",
  SI: "Structural isolation",
  DS: "Dispersed settlement pressure",
  GP: "Growth pressure",
  DI: "Demand and settlement intensity",
  RoadDensity: "Road density",
  IntersectionDensity: "Intersection density",
  R: "Road connectivity",
  G: "Green land",
  U: "Urban growth",
  DUS: "Dense underserved score",
  DRF: "Dispersed rural fragility score",
  GTM: "Growth-transport mismatch score",
  ABD: "Active but disconnected score",
  SDT: "Services desert score",
  TPHS: "Transport Poverty Hotspot Score",
  TPHS_norm: "Normalized hotspot score",
  TPHS_class: "Hotspot class",
  IPI: "Intervention Priority Index",
  IPI_class: "Priority class",
  DCS: "Data Confidence Score",
  DCS_source_completeness: "Source completeness",
  DCS_spatial_resolution: "Spatial resolution",
  DCS_temporal_freshness: "Temporal freshness",
  DCS_data_directness: "Data directness",
  CA: "Confidence adjustment",
  VPE: "Vulnerable population exposure",
  FEAS: "Feasibility screen",
  GM: "Growth mismatch",
  svi_score: "Social Vulnerability Index score",
  pt_deficit_score: "Public Transport Deficit",
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
  transport_access_score_mean: "Public Transport Deficit",
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
  "municipality_name",
  "intervention_priority_score",
  "intervention_priority_formula_score",
  "IPI",
  "IPI_class",
  "hotspot_score",
  "TPHS",
  "TPHS_class",
  "data_confidence_score",
  "DCS",
  "confidence_class",
  "SVI",
  "Elderly",
  "Labour",
  "Education",
  "Citizenship",
  "Income",
  "Motorisation",
  "LowCarAccess",
  "CarDependencyStress",
  "PTA",
  "PTD",
  "SA",
  "FR",
  "LA",
  "HA",
  "PTAL_component",
  "PTOL_component",
  "PTAL_PTOL",
  "ESA",
  "ESD",
  "HealthAccess",
  "SchoolAccess",
  "JobAccess",
  "GroceryAccess",
  "EOTD",
  "P",
  "B",
  "A",
  "L",
  "RoadDensity",
  "IntersectionDensity",
  "R",
  "G",
  "U",
  "typology",
  "dominant_drivers",
  "suggested_intervention_family",
  "ptal",
  "ptal_order",
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
  "category",
  "name",
  "address",
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
    "intervention_priority_formula_score",
    "priority_class",
    "hotspot_score",
    "data_confidence_score",
    "pt_deficit_score",
    "essential_services_deficit_score",
    "city2graph_network_penalty_score",
    "IPI",
    "TPHS",
    "DCS",
    "typology",
    "dominant_drivers",
    "suggested_intervention_family",
  ],
  "analysis-hotspot-score": [
    "TPHS",
    "TPHS_class",
    "SVI",
    "PTD",
    "ESD",
    "EOTD",
    "interaction_multiplier",
    "dominant_drivers",
  ],
  "analysis-data-confidence": [
    "DCS",
    "confidence_class",
    "DCS_source_completeness",
    "DCS_spatial_resolution",
    "DCS_temporal_freshness",
    "DCS_data_directness",
  ],
  "analysis-typology": [
    "typology",
    "dominant_drivers",
    "suggested_intervention_family",
    "DUS",
    "DRF",
    "GTM",
    "ABD",
    "SDT",
  ],
  "ptal-public-transport-deficit": [
    "PTD",
    "PTA",
    "SA",
    "FR",
    "LA",
    "HA",
    "PTAL_PTOL",
    "sampled_100m_cells",
    "total_ghsl_population_count",
    "municipality_name",
  ],
  "services-essential-service-deficit": [
    "ESD",
    "ESA",
    "HealthAccess",
    "SchoolAccess",
    "JobAccess",
    "GroceryAccess",
    "VSEG",
    "sampled_100m_cells",
    "municipality_name",
  ],
  "vulnerability-index": [
    "SVI",
    "Elderly",
    "Labour",
    "Education",
    "Citizenship",
    "Income",
    "LowCarAccess",
    "sampled_100m_cells",
    "municipality_name",
  ],
  "earth-observation-territorial-disadvantage": [
    "EOTD",
    "SI",
    "DS",
    "GP",
    "DI",
    "M",
    "sampled_100m_cells",
    "municipality_name",
  ],
};

const GROUP_OVERVIEW_ATTRIBUTE_PRIORITY: Partial<Record<LayerGroupId, string[]>> =
  {
    analysis: [
      "IPI",
      "TPHS",
      "DCS",
      "typology",
      "dominant_drivers",
    ],
    ptal: [
      "PTA",
      "PTD",
      "SA",
      "FR",
      "LA",
      "HA",
      "PTAL_component",
      "PTOL_component",
      "PTAL_PTOL",
      "stop_name",
      "dominant_mode",
      "line_count",
      "service_count",
      "total_freq_per_hour",
    ],
    services: [
      "ESD",
      "ESA",
      "HealthAccess",
      "SchoolAccess",
      "JobAccess",
      "GroceryAccess",
      "VSEG",
    ],
    vulnerability: [
      "SVI",
      "Elderly",
      "Labour",
      "Education",
      "Citizenship",
      "Income",
      "Motorisation",
      "LowCarAccess",
      "CarDependencyStress",
    ],
    "earth-observation": [
      "EOTD",
      "P",
      "B",
      "A",
      "L",
      "RoadDensity",
      "IntersectionDensity",
      "R",
      "G",
      "U",
      "SI",
      "DS",
      "GP",
      "DI",
      "M",
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

const NORMALIZED_ATTRIBUTE_KEYS = new Set([
  "SVI",
  "Elderly",
  "Labour",
  "Education",
  "Citizenship",
  "Income",
  "Motorisation",
  "LowCarAccess",
  "PTA",
  "PTD",
  "SA",
  "FR",
  "LA",
  "HA",
  "PTAL_component",
  "PTOL_component",
  "PTAL_PTOL",
  "ESA",
  "ESD",
  "HealthAccess",
  "SchoolAccess",
  "JobAccess",
  "GroceryAccess",
  "VSEG",
  "EOTD",
  "M",
  "SI",
  "DS",
  "GP",
  "DI",
  "DUS",
  "DRF",
  "GTM",
  "ABD",
  "SDT",
  "VPE",
  "FEAS",
  "GM",
  "CA",
  "TPHS_norm",
  "DCS_source_completeness",
  "DCS_spatial_resolution",
  "DCS_temporal_freshness",
  "DCS_data_directness",
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

  if (
    typeof value === "number" &&
    (EO_PERCENT_ATTRIBUTE_KEYS.has(key) || NORMALIZED_ATTRIBUTE_KEYS.has(key))
  ) {
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

  if (feature.layer.group === "ptal") {
    const categoricalLegend = publicTransportCategoryLegend(feature.layer);
    if (categoricalLegend) {
      const categoricalValue = source[categoricalLegend.property];
      const categoricalColor = publicTransportCategoricalColorFromValue(
        feature.layer,
        categoricalValue,
      );

      if (categoricalColor) return categoricalColor;
    }

    const pointClass = stopModeClasses(feature.layer)?.find(
      (item) => item.value === String(source.dominant_mode ?? "").toLowerCase(),
    );
    if (pointClass) return pointClass.color;

    const legend = publicTransportContinuousLegend(feature.layer);
    const value = feature.layer.thematicProperty
      ? Number(source[feature.layer.thematicProperty])
      : Number.NaN;

    if (legend && Number.isFinite(value)) {
      return interpolateHexColor(legend.stops, value, legend.max);
    }
  }

  if (feature.layer.group === "services") {
    const pointClass = servicePointClasses(feature.layer)?.find(
      (item) => item.value === String(source.category ?? "").toLowerCase(),
    );
    if (pointClass) return pointClass.color;

    const legend = serviceContinuousLegend(feature.layer);
    const value = feature.layer.thematicProperty
      ? Number(source[feature.layer.thematicProperty])
      : Number.NaN;

    if (legend && Number.isFinite(value)) {
      return interpolateHexColor(legend.stops, value, legend.max);
    }
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
    if (Number(source.total_ghsl_population_count) <= 0) {
      return VULNERABILITY_NO_DATA_COLOR;
    }
    if (classValue === "0" || classValue === "low") return palette[0];
    if (classValue === "1" || classValue === "medium") return palette[1];
    if (classValue === "2" || classValue === "high") return palette[2];
    if (source.n === 1 || classValue === "-1") return VULNERABILITY_NO_DATA_COLOR;

    const rankProperty = feature.layer.thematicRankProperty ?? null;
    const rank = rankProperty ? Number(source[rankProperty]) : Number.NaN;
    if (Number.isFinite(rank)) {
      if (rank < 1 / 3) return palette[0];
      if (rank < 2 / 3) return palette[1];
      return palette[2];
    }

    const value = feature.layer.thematicProperty
      ? Number(source[feature.layer.thematicProperty])
      : Number.NaN;
    if (Number.isFinite(value)) {
      if (value < 1 / 3) return palette[0];
      if (value < 2 / 3) return palette[1];
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
  const provider = LLM_PROVIDER_PRESETS[settings.provider]
    ? settings.provider
    : DEFAULT_LLM_SETTINGS.provider;
  const preset =
    LLM_PROVIDER_PRESETS[provider] ?? LLM_PROVIDER_PRESETS.xiaomi;

  if (provider === DEFAULT_LLM_SETTINGS.provider) {
    return {
      ...DEFAULT_LLM_SETTINGS,
      enabled: Boolean(settings.enabled),
    };
  }

  const baseUrl = settings.baseUrl.trim() || preset.baseUrl;
  const model = settings.model.trim() || preset.defaultModel;

  return {
    enabled: Boolean(settings.enabled),
    provider,
    baseUrl,
    apiKey: settings.apiKey,
    model,
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
  selectedFeature,
  onFeatureSelect,
}: {
  layer: PublicMilanLayer;
  opacity: number;
  material: LayerMaterial;
  contrast: number;
  selectedFeature: SelectedFeature | null;
  onFeatureSelect: (feature: SelectedFeature) => void;
}) {
  const { map, isLoaded } = useMap();
  const selectedFeatureIdRef = React.useRef<string | number | null>(null);

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = stableLayerSourceId(layer);
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
    const promoteId = featurePromoteId(layer);

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: "geojson",
        data: `/api/layers/${layer.id}?v=${layer.sizeBytes}`,
        promoteId,
        buffer: isLargeSurface ? LARGE_SURFACE_TILE_BUFFER : undefined,
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
    const publicTransportColor = publicTransportLayerColor(layer, material);
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
    const pointColor = pointLayerColor(layer, displayColor);
    const outlineColor = isContextPolygon
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
                : displayColor;
    const outlineOpacity = isContextPolygon
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
                : Math.min(effectiveOpacity + 0.28, 0.9);
    const outlineWidth = isContextPolygon
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
                : 0.8;

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
          "line-color": selectedLinePaint("#000000", outlineColor),
          "line-opacity": selectedLinePaint(1, outlineOpacity),
          "line-width": selectedLinePaint(2.8, outlineWidth),
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
          "line-color": selectedLinePaint("#000000", displayColor),
          "line-opacity": effectiveOpacity,
          "line-width": selectedLinePaint(4, 2),
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
          "circle-stroke-color": selectedLinePaint(
            "#000000",
            "rgba(255,255,255,0.92)",
          ),
          "circle-stroke-width": selectedLinePaint(2.5, 1),
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
        featureId: featureIdFromRenderedFeature(layer, feature),
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
      } catch {
        // Map theme changes can dispose the MapLibre instance before layers
        // finish cleanup in dev mode.
      }
    };
  }, [contrast, isLoaded, layer, map, material, onFeatureSelect, opacity]);

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = stableLayerSourceId(layer);
    if (!map.getSource(sourceId)) return;

    const nextFeatureId =
      selectedFeature?.layer.id === layer.id ? selectedFeature.featureId : null;
    const previousFeatureId = selectedFeatureIdRef.current;

    try {
      if (previousFeatureId != null && previousFeatureId !== nextFeatureId) {
        map.setFeatureState(
          { source: sourceId, id: previousFeatureId },
          { selected: false },
        );
      }

      if (nextFeatureId != null) {
        map.setFeatureState(
          { source: sourceId, id: nextFeatureId },
          { selected: true },
        );
      }

      selectedFeatureIdRef.current = nextFeatureId;
    } catch {
      selectedFeatureIdRef.current = null;
    }

    return () => {
      const currentFeatureId = selectedFeatureIdRef.current;

      try {
        if (currentFeatureId == null || !map?.getSource(sourceId)) return;

        map.setFeatureState(
          { source: sourceId, id: currentFeatureId },
          { selected: false },
        );
      } catch {
        // Map style changes can remove source state before this layer unmounts.
      } finally {
        selectedFeatureIdRef.current = null;
      }
    };
  }, [isLoaded, layer, map, selectedFeature]);

  return null;
}

function stableLayerSourceId(layer: PublicMilanLayer) {
  return `milan-source-${layer.fileName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function featurePromoteId(layer: PublicMilanLayer) {
  return layer.group === "analysis" && layer.kind === "point"
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
}

function featureIdFromRenderedFeature(
  layer: PublicMilanLayer,
  feature: NonNullable<MapLayerMouseEvent["features"]>[number],
) {
  return (
    normalizeFeatureId(feature.id) ??
    normalizeFeatureId(feature.properties?.[featurePromoteId(layer)])
  );
}

function normalizeFeatureId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

type SelectedFeaturePaintValue =
  | NonNullable<LineLayerSpecification["paint"]>[keyof NonNullable<
      LineLayerSpecification["paint"]
    >]
  | NonNullable<CircleLayerSpecification["paint"]>[keyof NonNullable<
      CircleLayerSpecification["paint"]
    >];

function selectedLinePaint<T extends SelectedFeaturePaintValue>(
  selectedValue: T,
  fallbackValue: T,
) {
  return [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    selectedValue,
    fallbackValue,
  ] as unknown as T;
}

function MainDirectoryHeader({
  activeFunction,
  action,
}: {
  activeFunction: PrimaryFunction;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <nav className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate font-medium">{activeFunction.label}</span>
      </nav>
      {action ? <div className="ml-auto flex shrink-0 items-center">{action}</div> : null}
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

  if (activeLayer?.group === "services") {
    const pointClasses = servicePointClasses(activeLayer);
    const legend = serviceContinuousLegend(activeLayer);

    if (pointClasses) {
      return <CategoricalLegend title={activeLayer.name} classes={pointClasses} />;
    }

    if (legend) return <ContinuousLegend layer={activeLayer} legend={legend} />;
  }

  if (activeLayer?.group === "earth-observation") {
    const legend = earthObservationLegend(activeLayer);

    if (legend) return <ContinuousLegend layer={activeLayer} legend={legend} />;
  }

  if (activeFunction.id === "ptal" && activeLayer?.group === "ptal") {
    const categoryLegend = publicTransportCategoryLegend(activeLayer);
    const modeClasses = stopModeClasses(activeLayer);
    const legend = publicTransportContinuousLegend(activeLayer);

    if (categoryLegend) {
      return <CategoricalLegend title={categoryLegend.label} classes={categoryLegend.classes} />;
    }

    if (modeClasses) {
      return <CategoricalLegend title={activeLayer.name} classes={modeClasses} />;
    }

    if (legend) return <ContinuousLegend layer={activeLayer} legend={legend} />;
  }

  if (!activeLayer) return null;

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

function CategoricalLegend({
  title,
  classes,
}: {
  title: string;
  classes: Array<{ color: string; label: string; value?: string }>;
}) {
  return (
    <LegendCard className="w-64">
      <div className="mb-2 text-sm font-medium leading-5">{title}</div>
      <div className="flex flex-col gap-1.5">
        {classes.map((item) => (
          <LegendSwatch key={item.value ?? item.label} color={item.color} label={item.label} />
        ))}
      </div>
    </LegendCard>
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
  "w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-background/80 py-0 ring-0 shadow-none";

type AnalysisChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type ScoreFormulaTerm = {
  label: string;
  value: number;
  weight?: number;
  contribution?: number;
  description?: string;
};

type ScoreFormulaSourceValue = {
  label: string;
  value: number;
};

type ScoreFormulaMetric = {
  key: string;
  label: string;
  value: number;
  formula: string;
  equation: string;
  summary: string;
  terms: ScoreFormulaTerm[];
  sourceValues: ScoreFormulaSourceValue[];
  notes?: string[];
};

type ScoreFormulaResponse = {
  scope: {
    type: "citywide" | "h3";
    h3Id: string | null;
    label: string;
  };
  sources: string[];
  metrics: ScoreFormulaMetric[];
};

function AnalysisDashboard({
  groups,
  contextLayers,
  theme,
  llmSettings,
  panelMode,
}: {
  groups: MilanLayerGroup[];
  contextLayers: PublicMilanLayer[];
  theme: ThemeMode;
  llmSettings: LlmSettings;
  panelMode: AnalysisPanelMode;
}) {
  const [selectedFeature, setSelectedFeature] =
    React.useState<SelectedFeature | null>(null);
  const priorityLayer = findLayer(groups, "analysis-intervention-priority");
  const boundaryLayer =
    contextLayers.find(
      (layer) => layer.id === "context-boundary-citta-metropolitana-milano",
    ) ?? null;
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
  const selectedH3Id = analysisText(selectedProps, "h3_id", "");
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
  const evidenceRows = React.useMemo(
    () =>
      breakdown
        .filter((item) => item.key !== "data_confidence_score")
        .toSorted((a, b) => b.value - a.value)
        .slice(0, 4),
    [breakdown],
  );
  const recommendationItems = React.useMemo(
    () =>
      buildHumanRecommendationItems({
        breakdown,
        confidenceScore,
        hotspotScore,
        priorityScore,
      }),
    [breakdown, confidenceScore, hotspotScore, priorityScore],
  );
  const reportPayload = {
    context: dashboardContext,
    priorityScore,
    hotspotScore,
    confidenceScore,
    breakdown,
    selectedFeature,
  };

  return (
    <div className="relative h-full w-full min-w-0 max-w-full overflow-y-auto lg:overflow-hidden overflow-x-hidden bg-muted/20 p-1.5 lg:p-2">
      <div className="grid min-h-full w-full min-w-0 gap-1.5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,2.28fr)_minmax(360px,0.72fr)] lg:grid-rows-[minmax(176px,0.29fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2.22fr)_minmax(390px,0.78fr)]">
        <Card
          className={cn(
            DASHBOARD_PANEL_CLASS,
            panelMode === "chat" ? "order-3" : "order-2",
            "min-h-[18rem] sm:min-h-[22rem] lg:order-none lg:col-start-1 lg:row-start-2 lg:min-h-0",
          )}
        >
          <CardContent className="h-full min-w-0 p-0">
            <div className="relative h-full overflow-hidden rounded-xl bg-muted">
              {priorityLayer ? (
                <GeoMap
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
                    selectedFeature={selectedFeature}
                    onFeatureSelect={setSelectedFeature}
                  />
                  {boundaryLayer ? (
                    <GeoJsonLayer
                      layer={boundaryLayer}
                      opacity={1}
                      material="default"
                      contrast={1}
                      selectedFeature={selectedFeature}
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

        <Card
          className={cn(
            DASHBOARD_PANEL_CLASS,
            panelMode === "chat" ? "order-1" : "order-3",
            "min-h-[18rem] sm:min-h-[22rem] lg:order-none lg:col-start-2 lg:row-span-2 lg:min-h-0",
          )}
        >
          <CardContent className="flex h-full min-h-0 min-w-0 flex-col gap-3 p-0">
            {panelMode === "chat" && llmSettings.enabled ? (
              <AnalysisChatBox
                className="h-full min-h-0"
                dashboardContext={dashboardContext}
                llmSettings={llmSettings}
                theme={theme}
              />
            ) : (
              <AnalysisDecisionSupportPanel
                className="min-h-0 flex-1"
                evidenceRows={evidenceRows}
                recommendationItems={recommendationItems}
                onExport={() => {
                  void exportAnalysisReport(reportPayload);
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            DASHBOARD_PANEL_CLASS,
            panelMode === "chat" ? "order-2" : "order-1",
            "min-h-[16rem] sm:min-h-[18rem] lg:order-none lg:col-start-1 lg:row-start-1 lg:min-h-0",
          )}
        >
          <CardContent className="grid h-full min-h-0 min-w-0 grid-cols-1 items-stretch gap-3 overflow-hidden p-2 sm:grid-cols-[minmax(0,0.58fr)_minmax(0,1fr)] sm:items-center lg:grid-cols-[minmax(390px,0.42fr)_minmax(0,1fr)]">
            <AnalysisPrioritySummary
              priorityScore={priorityScore}
              priorityStatus={priorityStatus}
              compact
            />
            <div className="flex min-h-0 min-w-0 flex-col justify-center gap-2 overflow-hidden">
              {breakdown.slice(0, 4).map((item) => (
                <DashboardScoreBar
                  key={item.key}
                  scoreKey={item.key}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                  h3Id={selectedH3Id}
                  compact
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function AnalysisPrioritySummary({
  priorityScore,
  priorityStatus,
  compact = false,
}: {
  priorityScore: number;
  priorityStatus: ReturnType<typeof priorityState>;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl bg-muted/35",
        compact ? "h-full p-3" : "p-5",
      )}
      style={{
        backgroundColor: priorityStatus.critical
          ? "color-mix(in oklab, var(--destructive) 12%, var(--card))"
          : "color-mix(in oklab, var(--muted) 70%, var(--card))",
      }}
    >
      <Badge
        variant="secondary"
        className={cn(
          "absolute z-10 rounded-full px-3.5 py-1.5 text-sm font-semibold",
          compact ? "right-3 top-3" : "right-5 top-5",
        )}
        style={{ color: scoreRiskColor(priorityScore) }}
      >
        {priorityStatus.critical ? <TriangleAlert className="size-4" /> : null}
        {priorityStatus.label}
      </Badge>
      <div className="flex min-h-0 flex-1 items-center">
        <ScoreGauge
          label="Intervention priority"
          value={priorityScore}
          size={compact ? "medium" : "large"}
        />
      </div>
    </div>
  );
}

function AnalysisDecisionSupportPanel({
  className,
  evidenceRows,
  recommendationItems,
  onExport,
}: {
  className?: string;
  evidenceRows: Array<{ key: string; label: string; value: number; color: string }>;
  recommendationItems: string[];
  onExport: () => void;
}) {
  const typologyRows = React.useMemo(
    () => buildAnalysisTypologyRows(evidenceRows),
    [evidenceRows],
  );
  const interventionFamilies = React.useMemo(
    () => buildAnalysisInterventionFamilies(evidenceRows),
    [evidenceRows],
  );

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl bg-background/75 p-3", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-500 dark:bg-yellow-400/10 dark:text-yellow-300">
            <Lightbulb className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-base font-semibold leading-5">
              Decision support
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="mt-3 min-h-0 flex-1">
        <div className="flex min-h-full flex-col justify-between gap-4 pr-3">
          <section className="rounded-xl bg-muted/30 p-2.5">
            <AnalysisTypologyDonut rows={typologyRows} />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">
                Intervention families
              </div>
            </div>
            <div className="grid gap-2">
              {interventionFamilies.map((item) => (
                <AnalysisInterventionFamilyRow key={item.label} item={item} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 text-sm font-semibold text-foreground">
              Recommendation
            </div>
            <ul className="grid gap-2">
              {recommendationItems.map((item, index) => (
                <li
                  key={item}
                  className="grid grid-cols-[1.55rem_minmax(0,1fr)] gap-2.5 rounded-xl bg-muted/35 px-3 py-2.5 text-sm leading-5 text-muted-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground ring-1 ring-border/60">
                    {index + 1}
                  </span>
                  <span className="break-words pt-1">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ScrollArea>

      <Button
        type="button"
        size="default"
        variant="secondary"
        className="mt-2 w-fit px-4"
        onClick={onExport}
      >
        <FileText data-icon="inline-start" />
        Export report
      </Button>
    </div>
  );
}

function AnalysisTypologyDonut({
  rows,
}: {
  rows: Array<{ label: string; value: number; color: string }>;
}) {
  const gradientStops = rows
    .reduce(
      (acc, row) => {
        const start = acc.cursor;
        const end = start + row.value;

        return {
          cursor: end,
          stops: [
            ...acc.stops,
            `${row.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`,
          ],
        };
      },
      { cursor: 0, stops: [] as string[] },
    )
    .stops.join(", ");

  return (
    <div className="grid h-full items-center gap-3 sm:grid-cols-[7.25rem_minmax(0,1fr)]">
      <div className="relative mx-auto flex size-24 shrink-0 items-center justify-center rounded-full ring-1 ring-border/70">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(${gradientStops})` }}
        />
        <div className="relative flex size-12 flex-col items-center justify-center rounded-full bg-background text-center ring-1 ring-border/70">
          <span className="text-base font-semibold tabular-nums">
            {Math.round(rows[0]?.value ?? 0)}%
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[0.75rem_minmax(0,1fr)_2.75rem] items-start gap-2 text-sm">
            <span
              className="mt-1 size-2.5 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="break-words font-medium leading-5">{row.label}</div>
            </div>
            <span className="text-right text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(row.value)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisInterventionFamilyRow({
  item,
}: {
  item: ReturnType<typeof buildAnalysisInterventionFamilies>[number];
}) {
  const Icon = item.icon;

  return (
    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-2 rounded-xl bg-muted/25 px-2.5 py-2">
      <span
        className="flex size-7 items-center justify-center rounded-lg text-background"
        style={{ backgroundColor: item.color }}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="break-words text-sm font-medium leading-5">{item.label}</div>
      </div>
      <Badge variant={item.match === "Primary" ? "default" : "secondary"}>
        {item.match}
      </Badge>
    </div>
  );
}

function buildAnalysisTypologyRows(
  evidenceRows: Array<{ key: string; label: string; value: number; color: string }>,
) {
  const labelByKey: Record<string, string> = {
    pt_deficit_score: "PT gap + low access",
    essential_services_deficit_score: "Service desert pressure",
    svi_score: "Vulnerable concentration",
    eo_territorial_disadvantage_score: "Territorial isolation",
  };
  const total = evidenceRows.reduce((sum, row) => sum + Math.max(1, row.value), 0);

  if (total <= 0) {
    return evidenceRows.map((row) => ({
      label: labelByKey[row.key] ?? row.label,
      value: 25,
      color: row.color,
    }));
  }

  return evidenceRows.map((row) => ({
    label: labelByKey[row.key] ?? row.label,
    value: (Math.max(1, row.value) / total) * 100,
    color: row.color,
  }));
}

function buildAnalysisInterventionFamilies(
  evidenceRows: Array<{ key: string; label: string; value: number; color: string }>,
) {
  const topKey = evidenceRows[0]?.key;
  const valueByKey = new Map(evidenceRows.map((row) => [row.key, row.value]));
  const familyRows = [
    {
      key: "pt_deficit_score",
      label: "Improve PT frequency & first/last mile",
      icon: TramFront,
      color: "#2563eb",
    },
    {
      key: "essential_services_deficit_score",
      label: "Expand essential services access",
      icon: HandHeart,
      color: "#10b981",
    },
    {
      key: "svi_score",
      label: "Equity safeguards and local validation",
      icon: UsersRound,
      color: "#f97316",
    },
    {
      key: "eo_territorial_disadvantage_score",
      label: "Spatial design feasibility",
      icon: Satellite,
      color: "#8b5cf6",
    },
  ];

  return familyRows
    .map((row) => ({
      ...row,
      score: valueByKey.get(row.key) ?? 0,
      match: row.key === topKey ? "Primary" : "Support",
    }))
    .toSorted((a, b) => b.score - a.score);
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

  if (driver.label === "Essential Services Deficit") {
    return `${prefix} is access to daily services (${score}/100). Check schools, healthcare, groceries and job access before treating this as a transit-only problem.`;
  }

  if (driver.label === "Public Transport Deficit") {
    return `${prefix} is public transport deficit (${score}/100). Review frequency, interchange quality and first/last-mile access before deciding between new coverage and better service.`;
  }

  if (driver.label === "Social Vulnerability Index") {
    return `${prefix} is social vulnerability (${score}/100). Prioritize measures that reduce everyday travel burden for residents with fewer mobility choices.`;
  }

  if (driver.label === "EO-Territorial Disadvantage Index") {
    return `${prefix} is territorial context from EO data (${score}/100). Confirm whether growth, built-up intensity or land-use isolation is creating the access problem.`;
  }

  return `${prefix} is ${driver.label.toLowerCase()} (${score}/100). Validate the local evidence before turning this score into an intervention package.`;
}

function findLayer(groups: MilanLayerGroup[], id: string) {
  return groups.flatMap((group) => group.layers).find((layer) => layer.id === id) ?? null;
}

const STRICT_ANALYSIS_KEY_ALIASES: Record<string, string[]> = {
  intervention_priority_score: ["priority_score_0_100", "IPI"],
  intervention_priority_formula_score: ["priority_score_0_100", "IPI"],
  hotspot_score: ["TPHS"],
  data_confidence_score: ["DCS"],
  priority_class: ["IPI_class"],
  hotspot_class: ["TPHS_class"],
  svi_score: ["SVI"],
  pt_deficit_score: ["PTD"],
  essential_services_deficit_score: ["ESD"],
  eo_territorial_disadvantage_score: ["EOTD"],
  growth_mismatch: ["GM"],
};

const STRICT_NORMALIZED_ANALYSIS_KEYS = new Set([
  "svi_score",
  "pt_deficit_score",
  "essential_services_deficit_score",
  "eo_territorial_disadvantage_score",
  "growth_mismatch",
  "SVI",
  "PTD",
  "ESD",
  "EOTD",
  "GM",
]);

function analysisNumber(
  properties: GeoJSON.GeoJsonProperties | null,
  key: string,
  fallback: number,
) {
  const candidateKeys = [key, ...(STRICT_ANALYSIS_KEY_ALIASES[key] ?? [])];
  const sourceKey = candidateKeys.find((candidate) => {
    const value = properties?.[candidate];
    return value !== null && value !== undefined && value !== "";
  });
  const value = sourceKey ? properties?.[sourceKey] : undefined;
  const scaleValue = (numericValue: number) =>
    STRICT_NORMALIZED_ANALYSIS_KEYS.has(key) ||
    STRICT_NORMALIZED_ANALYSIS_KEYS.has(sourceKey ?? "")
      ? numericValue <= 1
        ? numericValue * 100
        : numericValue
      : numericValue;

  if (typeof value === "number" && Number.isFinite(scaleValue(value))) {
    return scaleValue(value);
  }
  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return scaleValue(numericValue);
  }

  return fallback;
}

function analysisText(
  properties: GeoJSON.GeoJsonProperties | null,
  key: string,
  fallback = "Citywide baseline",
) {
  const candidateKeys = [key, ...(STRICT_ANALYSIS_KEY_ALIASES[key] ?? [])];
  const sourceKey = candidateKeys.find((candidate) => {
    const value = properties?.[candidate];
    return value !== null && value !== undefined && value !== "";
  });
  const value = sourceKey ? properties?.[sourceKey] : undefined;
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
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
  const priorityFormulaScore = analysisNumber(
    properties,
    "intervention_priority_formula_score",
    priorityScore,
  );

  return {
    scope: selectedFeature
      ? {
          h3_id: analysisText(properties, "h3_id", "selected H3"),
          municipality: analysisText(properties, "municipality_name", "Unknown"),
          selected_coordinate: {
            longitude: selectedFeature.coordinate[0],
            latitude: selectedFeature.coordinate[1],
          },
        }
      : {
          area: "Milan metropolitan citywide dashboard",
          h3_cells: ANALYSIS_DASHBOARD_SUMMARY.h3Cells,
        },
    scores: {
      intervention_priority_score: priorityScore,
      intervention_priority_formula_score: priorityFormulaScore,
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
        "Public Transport Deficit, Essential Services Deficit, Social Vulnerability Index and EO-Territorial Disadvantage Index",
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
      "Strict formulas and source joins passed the package formula audit at 1e-9 tolerance.",
      "TPHS and IPI are recomputed after H3 aggregation rather than averaged from 100 m scores.",
      "Income, motorisation, jobs and feasibility remain proxy evidence and require local validation.",
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
  h3Id,
  compact = false,
}: {
  scoreKey: string;
  label: string;
  value: number;
  color: string;
  h3Id?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Open ${label} formula details`}
          className={cn(
            "grid min-w-0 w-full max-w-full items-center gap-x-3 gap-y-2 overflow-hidden rounded-lg py-1 text-left text-sm outline-none transition hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring",
            compact
              ? "grid-cols-[minmax(0,1fr)_3rem] sm:grid-cols-[minmax(11rem,0.62fr)_minmax(6rem,1fr)_3rem] lg:grid-cols-[minmax(13rem,0.52fr)_minmax(8rem,1fr)_3rem]"
              : "grid-cols-[11rem_minmax(0,1fr)_3rem]",
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 overflow-hidden text-muted-foreground",
              compact ? "" : "truncate",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-lg bg-muted",
                compact ? "size-6" : "size-7",
              )}
              style={{ color }}
              aria-hidden="true"
            >
              <ScoreBreakdownIcon scoreKey={scoreKey} />
            </span>
            <span className="min-w-0 truncate">
              {label}
            </span>
          </span>
          <span className={cn("h-1.5 min-w-0 rounded-full bg-muted", compact && "order-3 col-span-2 sm:order-none sm:col-span-1")}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, value))}%`,
                backgroundColor: color,
              }}
            />
          </span>
          <span className={cn("min-w-0 text-right font-medium tabular-nums", compact && "order-2 sm:order-none")}>
            {value.toFixed(0)}
          </span>
        </button>
      </DialogTrigger>
      {open ? (
        <DashboardScoreFormulaDialog
          scoreKey={scoreKey}
          label={label}
          value={value}
          color={color}
          h3Id={h3Id}
        />
      ) : null}
    </Dialog>
  );
}

function DashboardScoreFormulaDialog({
  scoreKey,
  label,
  value,
  color,
  h3Id,
}: {
  scoreKey: string;
  label: string;
  value: number;
  color: string;
  h3Id?: string;
}) {
  const [formulaDetails, setFormulaDetails] =
    React.useState<ScoreFormulaMetric | null>(null);
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    "loading",
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ metric: scoreKey });
    if (h3Id) params.set("h3_id", h3Id);

    fetch(`/api/analysis/score-formula?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load score formula details");
        }
        return (await response.json()) as ScoreFormulaResponse;
      })
      .then((payload) => {
        const details = payload.metrics.find((item) => item.key === scoreKey);
        if (!details) {
          throw new Error("Missing score formula details");
        }
        setFormulaDetails(details);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [h3Id, scoreKey]);

  const details = formulaDetails;
  const terms = details?.terms ?? [];

  return (
    <DialogContent className="max-h-[min(34rem,calc(100vh-2rem))] max-w-[min(34rem,calc(100vw-2rem))] overflow-hidden p-0">
      <DialogTitle className="sr-only">
        {details?.label ?? label} calculation
      </DialogTitle>
      <DialogDescription className="sr-only">
        Score formula details for {label}.
      </DialogDescription>
      <div className="max-h-[min(28rem,calc(100vh-4rem))] overflow-y-auto px-5 py-5">
        {status === "loading" ? (
          <div className="text-sm text-muted-foreground">
            Loading formula details...
          </div>
        ) : null}
        {status === "error" ? (
          <div className="text-sm text-destructive">
            Formula details are not available for this score.
          </div>
        ) : null}
        {details ? (
          <div className="space-y-4">
            <ScoreOnlyDisplay value={details.value ?? value} color={color} />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Score contribution</h3>
              <div className="space-y-3">
                {terms.map((term) => (
                  <ScoreContributionBar
                    key={term.label}
                    label={term.label}
                    value={term.contribution ?? term.value}
                    color={color}
                  />
                ))}
              </div>
            </section>
            {details.sourceValues.length ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Formula inputs</h3>
                <div className="grid gap-1.5">
                  {details.sourceValues.map((item) => (
                    <ScoreComponentValue
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </DialogContent>
  );
}

function ScoreOnlyDisplay({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">Displayed score</span>
      <span
        className="text-2xl font-semibold leading-none tabular-nums"
        style={{ color }}
      >
        {formatFormulaNumber(value)}
      </span>
    </div>
  );
}

function ScoreContributionBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const barValue = Math.max(0, Math.min(100, Math.abs(value)));
  const barColor = value < 0 ? "oklch(0.55 0 0)" : color;

  return (
    <div className="grid grid-cols-[minmax(7.5rem,0.9fr)_minmax(0,1fr)_3.25rem] items-center gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <Progress
        value={barValue}
        className="h-2"
        style={{ "--primary": barColor } as React.CSSProperties}
      />
      <span className="text-right font-medium tabular-nums">
        {formatFormulaNumber(value)}
      </span>
    </div>
  );
}

function ScoreComponentValue({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">
        {formatFormulaNumber(value)}
      </span>
    </div>
  );
}

function formatFormulaNumber(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
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
  size?: "large" | "medium" | "compact";
}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  const color = scoreRiskColor(boundedValue);
  const isLarge = size === "large";
  const isMedium = size === "medium";

  if (isLarge) {
    return (
      <div className="grid w-full min-w-0 grid-cols-[104px_minmax(7.25rem,1fr)] items-center gap-3 overflow-visible">
        <svg
          viewBox="0 0 120 78"
          className="h-24 w-[6.5rem]"
          aria-hidden="true"
        >
          <path
            d="M18 64A42 42 0 0 1 102 64"
            fill="none"
            stroke="currentColor"
            strokeLinecap="butt"
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
        </svg>
        <div className="min-w-[7.25rem] justify-self-end">
          <div
            className="flex w-[7.25rem] items-baseline justify-end whitespace-nowrap leading-none tabular-nums"
            style={{ color }}
          >
            <span className="inline-block text-right text-[clamp(2.5rem,3.4vw,3.1rem)] font-semibold">
              {Math.round(boundedValue)}
            </span>
            <span className="ml-1 inline-block shrink-0 text-left text-base font-semibold">/100</span>
          </div>
          <div className="mt-1 whitespace-nowrap text-right text-xs text-muted-foreground">
            {label}
          </div>
        </div>
      </div>
    );
  }

  if (isMedium) {
    return (
      <div className="grid w-full min-w-0 grid-cols-1 items-center gap-1 overflow-hidden sm:grid-cols-[minmax(148px,0.9fr)_minmax(7.25rem,1fr)] sm:gap-3 sm:overflow-visible">
        <svg
          viewBox="0 0 120 78"
          className="h-28 w-40 justify-self-start sm:h-36 sm:w-44"
          aria-hidden="true"
        >
          <path
            d="M18 64A42 42 0 0 1 102 64"
            fill="none"
            stroke="currentColor"
            strokeLinecap="butt"
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
        </svg>
        <div className="min-w-0 justify-self-start sm:min-w-[7.25rem] sm:justify-self-end">
          <div
            className="flex w-full max-w-[7.25rem] items-baseline justify-start whitespace-nowrap leading-none tabular-nums sm:w-[7.25rem] sm:justify-end"
            style={{ color }}
          >
            <span className="inline-block text-right text-[3rem] font-semibold sm:text-[3.35rem]">
              {Math.round(boundedValue)}
            </span>
            <span className="ml-1 inline-block shrink-0 text-left text-base font-semibold">/100</span>
          </div>
          <div className="mt-1 whitespace-nowrap text-left text-xs text-muted-foreground sm:text-right">
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
          strokeLinecap="butt"
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
  className,
  dashboardContext,
  llmSettings,
  theme,
}: {
  className?: string;
  dashboardContext: ReturnType<typeof buildAnalysisDashboardContext>;
  llmSettings: LlmSettings;
  theme: ThemeMode;
}) {
  const [prompt, setPrompt] = React.useState("");
  const [activePreset, setActivePreset] = React.useState<string>("");
  const [activePresetCategoryId, setActivePresetCategoryId] = React.useState(
    ANALYSIS_PRESET_CATEGORIES[0].id,
  );
  const [showPresets, setShowPresets] = React.useState(false);
  const promptRef = React.useRef<HTMLTextAreaElement | null>(null);
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
    llmSettings.model.trim();
  const activeModel =
    llmSettings.provider === DEFAULT_LLM_SETTINGS.provider &&
    (llmSettings.model.trim() || DEFAULT_LLM_SETTINGS.model) ===
      DEFAULT_LLM_SETTINGS.model
      ? "Default"
      : llmSettings.model.trim() || DEFAULT_LLM_SETTINGS.model;
  const isStreamingAnswerVisible =
    state.status === "loading" &&
    messages[messages.length - 1]?.role === "assistant";
  const activePresetCategory =
    ANALYSIS_PRESET_CATEGORIES.find(
      (category) => category.id === activePresetCategoryId,
    ) ?? ANALYSIS_PRESET_CATEGORIES[0];

  const choosePreset = React.useCallback((preset: AnalysisPresetQuestion) => {
    setActivePreset(preset.prompt);
    setPrompt(preset.prompt);
    setShowPresets(false);
    window.requestAnimationFrame(() => promptRef.current?.focus());
  }, []);

  const askAssistant = React.useCallback(
    async (question: string) => {
      const trimmedQuestion = question.trim();
      if (!canAsk || !trimmedQuestion) return;

      setState({ status: "loading", answer: null, error: null });
      setMessages((current) => [
        ...current,
        { role: "user", content: trimmedQuestion },
      ]);
      setActivePreset("");
      setShowPresets(false);
      setPrompt("");

      try {
        const response = await fetch("/api/analysis/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...llmSettings,
            question: trimmedQuestion,
            context: dashboardContext,
            stream: true,
          }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | AnalysisInterpretResponse
            | null;
          throw new Error(data?.error ?? "AI explanation failed");
        }

        if (!response.body) {
          const data = (await response.json()) as AnalysisInterpretResponse;
          if (!data.answer) throw new Error(data.error ?? "AI explanation failed");
          setState({ status: "success", answer: data.answer, error: null });
          setMessages((current) => [
            ...current,
            { role: "assistant", content: data.answer ?? "" },
          ]);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          answer += chunk;
          const visibleAnswer = answer;
          setMessages((current) => {
            const next = [...current];
            if (next[next.length - 1]?.role === "assistant") {
              next[next.length - 1] = {
                role: "assistant",
                content: visibleAnswer,
              };
            } else {
              next.push({ role: "assistant", content: visibleAnswer });
            }
            return next;
          });
        }

        answer += decoder.decode();
        if (!answer.trim()) throw new Error("AI explanation failed");
        const finalAnswer = answer;
        setMessages((current) => {
          const next = [...current];
          if (next[next.length - 1]?.role === "assistant") {
            next[next.length - 1] = {
              role: "assistant",
              content: finalAnswer,
            };
          } else {
            next.push({ role: "assistant", content: finalAnswer });
          }
          return next;
        });
        setState({ status: "success", answer, error: null });
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
    <div
      data-analysis-chat-box
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-background/95 p-4 shadow-sm ring-1 ring-border/50 backdrop-blur",
        className,
      )}
    >
      <ScrollArea
        data-analysis-chat-scroll
        className="min-h-0 max-h-[min(16rem,calc(100svh-22rem))] flex-none overflow-x-hidden rounded-2xl bg-muted/25 lg:max-h-none lg:flex-1"
      >
        <div className="flex min-w-0 flex-col gap-5 p-4">
          {messages.slice(-6).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex w-full min-w-0 max-w-full gap-2",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" ? (
                <Avatar className="mt-0.5 size-7 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    <Bot />
                  </AvatarFallback>
                </Avatar>
              ) : null}
              <div
                className={cn(
                  "w-full min-w-0 overflow-hidden rounded-2xl px-4 py-3 text-sm leading-6 break-words",
                  message.role === "user"
                    ? "max-w-[82%] bg-primary text-primary-foreground"
                    : "max-w-[calc(100%-2.75rem)] bg-background/95 text-foreground shadow-sm ring-1 ring-border/40",
                )}
              >
                <ChatMessageContent
                  content={message.content}
                  muted={message.role === "user"}
                  theme={theme}
                />
              </div>
            </div>
          ))}
          {state.status === "loading" && !isStreamingAnswerVisible ? (
            <div className="flex justify-start gap-2">
              <Avatar className="mt-0.5 size-7 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  <Bot />
                </AvatarFallback>
              </Avatar>
              <ThinkingIndicator />
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div
        data-analysis-chat-presets
        className="mt-3 shrink-0 overflow-hidden rounded-2xl bg-background/90 shadow-sm ring-1 ring-border/50"
      >
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full justify-between rounded-none px-3 text-sm font-medium"
          aria-expanded={showPresets}
          onClick={() => setShowPresets((open) => !open)}
        >
          <span>Recommended questions</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showPresets && "rotate-180",
            )}
          />
        </Button>
        {showPresets ? (
          <div className="grid gap-2 border-t p-2">
            <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted/60 p-1">
              {ANALYSIS_PRESET_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  size="sm"
                  variant={
                    activePresetCategory.id === category.id
                      ? "default"
                      : "ghost"
                  }
                  className="h-7 min-w-0 rounded-lg px-1.5 text-[11px] font-medium"
                  onClick={() => setActivePresetCategoryId(category.id)}
                >
                  <span className="truncate">{category.label}</span>
                </Button>
              ))}
            </div>
            <div className="grid gap-1.5">
              {activePresetCategory.questions.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={
                    activePreset === preset.prompt ? "default" : "secondary"
                  }
                  className="h-auto min-h-9 w-full justify-start rounded-xl px-3 py-2 text-left text-xs leading-5 whitespace-normal"
                  onClick={() => choosePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        data-analysis-chat-input
        className="mt-3 flex min-h-[104px] shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/60"
      >
        <div className="min-h-0 flex-1">
          <Textarea
            ref={promptRef}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setActivePreset("");
            }}
            placeholder={
              canAsk
                ? "Ask about this hotspot..."
                : "Enable AI and set a model in Settings."
            }
            className="min-h-[52px] resize-none border-0 bg-transparent p-3 text-sm shadow-none focus-visible:ring-0"
            disabled={!canAsk}
          />
        </div>
        <div className="flex min-h-11 items-center gap-2 border-t px-3 py-2">
          <div
            data-analysis-active-model
            className="flex h-8 max-w-[16rem] min-w-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground"
            title={`${activeModel} · ${llmSettings.provider || DEFAULT_LLM_SETTINGS.provider}`}
          >
            <span className="truncate">{activeModel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate text-muted-foreground">
              {llmSettings.provider || DEFAULT_LLM_SETTINGS.provider}
            </span>
          </div>
          <div className="ml-auto flex items-center">
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              onClick={() => askAssistant(prompt)}
              disabled={!canAsk || state.status === "loading" || !prompt.trim()}
            >
              <SendHorizontal />
              <span className="sr-only">Ask analysis chat</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="max-w-[calc(100%-2.75rem)] rounded-2xl bg-background/95 px-4 py-3 text-sm shadow-sm ring-1 ring-border/40">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="flex items-center gap-2">
          <ChevronDown className="animate-pulse" />
          <span className="font-medium text-foreground">Thinking</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:120ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function ChatMessageContent({
  content,
  muted = false,
  theme,
}: {
  content: string;
  muted?: boolean;
  theme: ThemeMode;
}) {
  const blocks = parseChatMarkdown(content);

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden">
      {blocks.map((block, index) => {
        if (block.type === "math") {
          return <FormulaBlock key={index} text={block.text} muted={muted} />;
        }

        if (block.type === "list") {
          if (block.ordered) {
            return (
              <ol
                key={index}
                className={cn(
                  "flex list-decimal flex-col gap-2 pl-5 text-[13px] leading-6 font-normal text-foreground/80 marker:text-muted-foreground",
                  muted && "text-primary-foreground/90 marker:text-primary-foreground/70",
                )}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-1">
                    {renderParagraphMarkdown(item, muted)}
                  </li>
                ))}
              </ol>
            );
          }

          return (
            <ul
              key={index}
              className={cn(
                "flex flex-col gap-2 text-[13px] leading-6 font-normal text-foreground/80",
                muted && "text-primary-foreground/90",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <CheckCircle2
                    className={cn(
                      "mt-1 size-3.5 shrink-0 text-primary",
                      muted && "text-primary-foreground",
                    )}
                  />
                  <span className="min-w-0">
                    {renderParagraphMarkdown(item, muted)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <AnalysisMarkdownTable
              key={index}
              block={block}
              muted={muted}
              theme={theme}
            />
          );
        }

        if (isFormulaParagraphText(block.text)) {
          return (
            <div
              key={index}
              className={cn(
                "text-[13px] leading-6 font-normal text-foreground/80",
                block.emphasis && "text-foreground/90",
                muted && "text-primary-foreground/90",
              )}
            >
              {renderParagraphMarkdown(block.text, muted)}
            </div>
          );
        }

        return (
          <p
            key={index}
            className={cn(
              "whitespace-pre-wrap break-words text-[13px] leading-6 font-normal text-foreground/80",
              block.emphasis && "text-foreground/90",
              muted && "text-primary-foreground/90",
            )}
          >
            {renderParagraphMarkdown(block.text, muted)}
          </p>
        );
      })}
    </div>
  );
}

function AnalysisMarkdownTable({
  block,
  muted = false,
  theme,
}: {
  block: ChatMarkdownTableBlock;
  muted?: boolean;
  theme: ThemeMode;
}) {
  return (
    <Dialog>
      <DraggableTableScroll
        muted={muted}
        action={
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Expand table"
              data-analysis-table-expand
            >
              <Maximize2 />
            </Button>
          </DialogTrigger>
        }
      >
        <AnalysisTableRail block={block} muted={muted} />
      </DraggableTableScroll>

      <DialogContent
        className={[
          theme === "dark" ? "dark" : "",
          "grid max-h-[min(42rem,calc(100vh-2rem))] max-w-[min(72rem,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(72rem,calc(100vw-2rem))]",
        ].join(" ")}
      >
        <DialogHeader className="border-b px-4 py-3 pr-12">
          <DialogTitle>Table</DialogTitle>
          <DialogDescription className="sr-only">
            Full table content
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 p-3">
          <DraggableTableScroll
            muted={muted}
            viewportClassName="max-h-full"
          >
            <AnalysisTableRail block={block} muted={muted} />
          </DraggableTableScroll>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisTableRail({
  block,
  muted = false,
}: {
  block: ChatMarkdownTableBlock;
  muted?: boolean;
}) {
  return (
    <div
      data-analysis-table-rail
      role="table"
      aria-label="Analysis answer table"
      className="grid w-max min-w-full overflow-hidden text-xs leading-5"
      style={{
        gridTemplateColumns: `repeat(${block.headers.length}, minmax(10rem, 14rem))`,
      }}
    >
      {block.headers.map((header, headerIndex) => (
        <div
          key={`header-${headerIndex}`}
          role="columnheader"
          className={cn(
            "sticky top-0 z-10 min-w-0 border-b border-border/70 bg-muted/60 px-3 py-2 font-semibold text-foreground break-words",
            headerIndex > 0 && "border-l border-border/60",
            muted && "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground",
            tableAlignmentClass(block.alignments[headerIndex]),
          )}
        >
          {renderInlineMarkdown(header, muted)}
        </div>
      ))}

      {block.rows.map((row, rowIndex) =>
        block.headers.map((_, cellIndex) => (
          <div
            key={`row-${rowIndex}-cell-${cellIndex}`}
            data-analysis-table-cell
            role="cell"
            className={cn(
              "min-w-0 border-t border-border/50 px-3 py-3 align-top break-words",
              cellIndex > 0 && "border-l border-border/50",
              rowIndex % 2 === 1 && "bg-muted/25",
              muted && "border-primary-foreground/20",
              muted && rowIndex % 2 === 1 && "bg-primary-foreground/10",
              tableAlignmentClass(block.alignments[cellIndex]),
            )}
          >
            {renderInlineMarkdown(row[cellIndex] ?? "", muted)}
          </div>
        )),
      )}
    </div>
  );
}

function DraggableTableScroll({
  children,
  muted = false,
  action,
  viewportClassName,
}: {
  children: React.ReactNode;
  muted?: boolean;
  action?: React.ReactNode;
  viewportClassName?: string;
}) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    scrollLeft: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
  });

  const endDrag = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (
      scroller &&
      dragStateRef.current.pointerId !== null &&
      scroller.hasPointerCapture(dragStateRef.current.pointerId)
    ) {
      scroller.releasePointerCapture(dragStateRef.current.pointerId);
    }
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    event.currentTarget.dataset.dragging = "false";
  }, []);

  return (
    <div
      data-analysis-table-shell
      className={cn(
        "grid w-full min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl ring-1 ring-border/60",
        muted && "ring-primary-foreground/30",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground",
          muted && "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground/80",
        )}
      >
        <span>Table</span>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
      <div
        ref={scrollerRef}
        data-analysis-table-viewport
        data-analysis-table-scroll
        role="region"
        tabIndex={0}
        aria-label="Scrollable table"
        className={cn(
          "max-h-[min(24rem,56vh)] w-full min-w-0 max-w-full overflow-auto overscroll-contain",
          "cursor-grab active:cursor-grabbing select-none touch-pan-x touch-pan-y",
          "[scrollbar-gutter:stable] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-muted/60",
          muted && "[&::-webkit-scrollbar-thumb]:bg-primary-foreground/50 [&::-webkit-scrollbar-track]:bg-primary-foreground/15",
          viewportClassName,
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const scroller = event.currentTarget;
          dragStateRef.current = {
            active: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: scroller.scrollLeft,
          };
          scroller.setPointerCapture(event.pointerId);
          scroller.dataset.dragging = "true";
        }}
        onPointerMove={(event) => {
          const state = dragStateRef.current;
          if (!state.active || state.pointerId !== event.pointerId) return;
          event.preventDefault();
          event.currentTarget.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(event) => {
          if (dragStateRef.current.active) endDrag(event);
        }}
      >
        {children}
      </div>
    </div>
  );
}

function tableAlignmentClass(alignment: "left" | "center" | "right") {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return "text-left";
}

function FormulaBlock({
  text,
  muted = false,
}: {
  text: string;
  muted?: boolean;
}) {
  return (
    <div
      data-analysis-math-block
      data-analysis-formula-block
      className={cn(
        "max-h-36 max-w-full overflow-auto rounded-xl bg-muted/60 px-3 py-2 text-[13px] leading-7 text-foreground whitespace-pre-wrap break-words overscroll-contain [overflow-wrap:anywhere] [scrollbar-gutter:stable]",
        muted && "bg-primary-foreground/10 text-primary-foreground",
      )}
      aria-label={normalizeFormulaText(text)}
    >
      <FormulaText text={text} muted={muted} />
    </div>
  );
}

function FormulaText({
  text,
  muted = false,
}: {
  text: string;
  muted?: boolean;
}) {
  const tokens = tokenizeFormulaText(text) as FormulaToken[];

  return (
    <span
      data-analysis-formula-rendered
      className={cn(
        "font-medium tracking-normal text-inherit tabular-nums",
        muted && "text-primary-foreground",
      )}
    >
      {tokens.map((token, index) => {
        if (token.type === "sub") {
          return (
            <sub key={index} className="text-[0.72em] leading-none">
              {token.text}
            </sub>
          );
        }

        if (token.type === "sup") {
          return (
            <sup key={index} className="text-[0.72em] leading-none">
              {token.text}
            </sup>
          );
        }

        return <React.Fragment key={index}>{token.text}</React.Fragment>;
      })}
    </span>
  );
}

function renderParagraphMarkdown(text: string, muted = false) {
  const labelMatch =
    text.match(/^\*\*([^*]{2,96}:)\*\*\s*(.*)$/) ??
    text.match(/^([^:]{2,96}:)\s+(.+)$/);

  if (labelMatch) {
    const label = labelMatch[1];
    const body = labelMatch[2] ?? "";
    const formula = isFormulaLabel(label) ? extractInlineFormula(body) : null;

    return (
      <>
        <strong
          className={cn(
            "font-semibold text-foreground",
            muted && "text-primary-foreground",
          )}
        >
          {label}
        </strong>
        {formula ? (
          <div className="mt-2">
            <FormulaBlock text={formula} muted={muted} />
          </div>
        ) : body ? (
          <> {renderInlineMarkdown(body, muted)}</>
        ) : null}
      </>
    );
  }

  return renderInlineMarkdown(text, muted);
}

function isFormulaLabel(label: string) {
  return label.replace(/\*/g, "").trim().toLowerCase() === "formula:";
}

function isFormulaParagraphText(text: string) {
  const labelMatch =
    text.match(/^\*\*([^*]{2,96}:)\*\*\s*(.*)$/) ??
    text.match(/^([^:]{2,96}:)\s+(.+)$/);

  return Boolean(labelMatch && isFormulaLabel(labelMatch[1]));
}

function extractInlineFormula(text: string) {
  const trimmed = text.trim();
  const dollarMatch =
    trimmed.match(/^\$([\s\S]+)\$$/) ?? trimmed.match(/\$([\s\S]+?)\$/);
  if (dollarMatch?.[1]) return dollarMatch[1].trim();

  const parenMatch =
    trimmed.match(/^\\\(([\s\S]+)\\\)$/) ??
    trimmed.match(/\\\(([\s\S]+?)\\\)/);
  if (parenMatch?.[1]) return parenMatch[1].trim();

  if (/\\(?:times|frac|sum|sqrt|le|ge)|[A-Za-z0-9)]\s*=\s*|_/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function renderInlineMarkdown(text: string, muted = false) {
  const parts = text
    .split(/(\*\*[^*]+\*\*|\$[^$\n]+\$|\\\([^\n]+?\\\))/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className={cn(
            "font-semibold text-foreground",
            muted && "text-primary-foreground",
          )}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      (part.startsWith("$") && part.endsWith("$")) ||
      (part.startsWith("\\(") && part.endsWith("\\)"))
    ) {
      const textContent = part.startsWith("$")
        ? part.slice(1, -1)
        : part.slice(2, -2);

      return (
        <span
          key={index}
          data-analysis-inline-math
          className={cn(
            "inline-flex max-w-full overflow-x-auto rounded bg-muted px-1.5 py-0.5 align-middle text-[0.92em] text-foreground whitespace-nowrap",
            muted && "bg-primary-foreground/15 text-primary-foreground",
          )}
        >
          <FormulaText text={textContent} muted={muted} />
        </span>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
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

  const reportWindow = window.open("", "_blank", "width=980,height=1200");
  if (!reportWindow) return;

  reportWindow.document.open();
  reportWindow.document.write(
    '<!doctype html><html><head><title>Preparing report</title></head><body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:40px;color:#111827"><h1 style="font-size:20px">Preparing report...</h1><p>Loading analysis context.</p></body></html>',
  );
  reportWindow.document.close();

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

  if (reportWindow.closed) return;

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
    [
      "Public Transport Deficit",
      "Essential Services Deficit",
      "Social Vulnerability Index",
      "EO-Territorial Disadvantage Index",
    ],
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
    "Typology is assigned from the dominant score pattern and EO-Territorial Disadvantage Index context.";
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
            <p style="margin-top:8px">Hotspot score highlights where overlapping Social Vulnerability Index, Essential Services Deficit and transport poverty signals concentrate.</p>
          </div>
          <div>
            <div class="map-plate">
              <img src="${priorityImage}" alt="Intervention Priority Index map" />
              <div class="map-caption">Intervention Priority Index<br><span class="label">${Math.round(reportPriority)}/100</span></div>
            </div>
            <div class="gradient" style="margin-top:10px"></div>
            <p style="margin-top:8px">The intervention index combines normalized hotspot score, vulnerable population exposure, feasibility, growth mismatch and confidence adjustment.</p>
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
        <div class="quote">EO-Territorial Disadvantage Index score: <strong>${eoScore.toFixed(1)} / 100</strong>. Growth mismatch signal: <strong>${growthMismatch.toFixed(1)} / 100</strong>. This indicator is used as territorial interpretation evidence from structural isolation, dispersed settlement pressure, growth pressure, and demand/settlement intensity. It supports diagnosis but does not replace local validation.</div>
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
      label: "Social Vulnerability Index",
      value: reportBreakdownValue(
        card,
        "social_vulnerability",
        fallbackByLabel.get("Social Vulnerability Index") ?? 0,
      ),
      color: "#f97316",
    },
    {
      key: "pt",
      label: "Public Transport Deficit",
      value: reportBreakdownValue(
        card,
        "public_transport_deficit",
        fallbackByLabel.get("Public Transport Deficit") ?? 0,
      ),
      color: "#2563eb",
    },
    {
      key: "services",
      label: "Essential Services Deficit",
      value: reportBreakdownValue(
        card,
        "essential_services_deficit",
        fallbackByLabel.get("Essential Services Deficit") ?? 0,
      ),
      color: "#10b981",
    },
    {
      key: "eo",
      label: "EO-Territorial Disadvantage Index",
      value: reportBreakdownValue(
        card,
        "eo_territorial_disadvantage",
        fallbackByLabel.get("EO-Territorial Disadvantage Index") ?? 0,
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
  contextLayers,
  activeFunction,
  activeLayers,
  activeLayerIds,
  opacities,
  basemap,
  llmSettings,
  analysisPanelMode,
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
  contextLayers: PublicMilanLayer[];
  activeFunction: PrimaryFunction;
  activeLayers: PublicMilanLayer[];
  activeLayerIds: Set<string>;
  opacities: Record<string, number>;
  basemap: BasemapId;
  llmSettings: LlmSettings;
  analysisPanelMode: AnalysisPanelMode;
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
  const boundaryLayers = contextLayers.filter(
    (layer) => layer.id === "context-boundary-citta-metropolitana-milano",
  );

  if (isAnalysisDashboard) {
    return (
      <AnalysisDashboard
        groups={groups}
        contextLayers={boundaryLayers}
        theme={theme}
        llmSettings={llmSettings}
        panelMode={analysisPanelMode}
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
            selectedFeature={selectedFeature}
            onFeatureSelect={onFeatureSelect}
          />
        ))}
        {boundaryLayers.map((layer) => (
          <GeoJsonLayer
            key={layer.id}
            layer={layer}
            opacity={layerOpacity(layer, opacities)}
            material="default"
            contrast={1}
            selectedFeature={selectedFeature}
            onFeatureSelect={onFeatureSelect}
          />
        ))}
      </GeoMap>
    </div>
  );
}

export function MilanLayerViewer({
  groups,
  contextLayers = [],
}: MilanLayerViewerProps) {
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
  const [analysisPanelMode, setAnalysisPanelMode] =
    React.useState<AnalysisPanelMode>("summary");
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
          <MainDirectoryHeader
            activeFunction={activeFunction}
            action={
              activeFunction.id === "ai-agent" &&
              activeLayerIds.has("analysis-dashboard") &&
              llmSettings.enabled ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-full border-border/70 bg-background/70 px-3 text-foreground shadow-none backdrop-blur hover:bg-muted/80",
                    analysisPanelMode === "chat" &&
                      "bg-muted text-foreground ring-1 ring-border/70",
                  )}
                  onClick={() =>
                    setAnalysisPanelMode((mode) =>
                      mode === "chat" ? "summary" : "chat",
                    )
                  }
                >
                  <Bot data-icon="inline-start" />
                  Ask AI
                </Button>
              ) : null
            }
          />
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <MilanMapCanvas
              theme={theme}
              groups={groups}
              contextLayers={contextLayers}
              activeFunction={activeFunction}
              activeLayers={activeLayers}
              activeLayerIds={activeLayerIds}
              opacities={opacities}
              basemap={basemap}
              llmSettings={llmSettings}
              analysisPanelMode={analysisPanelMode}
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
