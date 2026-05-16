import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalysisSummary = {
  title?: string;
  generated_at_utc?: string;
  h3_resolution?: number;
  h3_count?: number;
  hotspot_cluster_count?: number;
  high_priority_h3_count?: number;
  score_means?: Record<string, number>;
  priority_class_distribution?: Array<Record<string, string | number>>;
  hotspot_class_distribution?: Array<Record<string, string | number>>;
  typology_distribution?: Array<Record<string, string | number>>;
  top_10_h3?: AnalysisHotspotCard[];
};

type AnalysisHotspotCard = {
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

let cardsCache: AnalysisHotspotCard[] | null = null;
let summaryCache: AnalysisSummary | null = null;

const summaryPathCandidates = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "analysis", "summary.json"),
  path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "data",
    "geojson",
    "analysis",
    "summary.json",
  ),
];

const hotspotCardsPathCandidates = [
  path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "data",
    "analysis",
    "tables",
    "ai_hotspot_cards.json",
  ),
  path.join(
    /*turbopackIgnore: true*/ process.cwd(),
    "data",
    "geojson",
    "analysis",
    "tables",
    "ai_hotspot_cards.json",
  ),
];

async function firstExistingPath(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await fs.access(/*turbopackIgnore: true*/ candidate);
      return candidate;
    } catch {
      // Try the next known local data root.
    }
  }

  return null;
}

async function readAnalysisSummary() {
  if (summaryCache) return summaryCache;

  const summaryPath = await firstExistingPath(summaryPathCandidates);
  if (!summaryPath) return null;

  summaryCache = JSON.parse(
    await fs.readFile(/*turbopackIgnore: true*/ summaryPath, "utf8"),
  ) as AnalysisSummary;

  return summaryCache;
}

async function readHotspotCards() {
  if (cardsCache) return cardsCache;

  const cardsPath = await firstExistingPath(hotspotCardsPathCandidates);
  if (!cardsPath) return [];

  const rawCards = await fs.readFile(/*turbopackIgnore: true*/ cardsPath, "utf8");
  cardsCache = JSON.parse(rawCards.replace(/\bNaN\b/g, "null")) as AnalysisHotspotCard[];

  return cardsCache;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const h3Id = url.searchParams.get("h3_id")?.trim();
  const municipality = url.searchParams.get("municipality")?.trim();

  const [summary, cards] = await Promise.all([
    readAnalysisSummary(),
    readHotspotCards(),
  ]);
  const topCards = cards.slice(0, 12);
  const selectedCard =
    (h3Id
      ? cards.find((card) => card.h3_id?.toLowerCase() === h3Id.toLowerCase())
      : null) ??
    (municipality
      ? cards.find(
          (card) =>
            (card.municipality ?? card.municipality_name ?? "").toLowerCase() ===
            municipality.toLowerCase(),
        )
      : null) ??
    null;

  return Response.json({
    summary,
    selectedCard,
    topCards,
    images: {
      hotspot: "/analysis/images/hotspot_score_h3_res9.png",
      interventionPriority:
        "/analysis/images/intervention_priority_h3_res9.png",
    },
  });
}
