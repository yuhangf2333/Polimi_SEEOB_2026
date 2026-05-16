import { getScoreFormulaDetails } from "@/lib/analysis-score-formulas.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const h3Id = url.searchParams.get("h3_id")?.trim() || undefined;
  const metricKey = url.searchParams.get("metric")?.trim() || undefined;
  const details = getScoreFormulaDetails({ h3Id, metricKey });

  if (metricKey && details.metrics.length === 0) {
    return Response.json(
      { error: `Unsupported score metric: ${metricKey}` },
      { status: 404 },
    );
  }

  return Response.json(details);
}
