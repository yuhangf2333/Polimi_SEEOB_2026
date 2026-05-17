import { promises as fs } from "node:fs";
import path from "node:path";

export type City2graphTransitSummary = {
  h3Id: string;
  routeCount: number | null;
  stopCount: number | null;
  modeCount: number | null;
  meanWaitMin: number | null;
  meanWalkMin: number | null;
  routeDependencyHhi: number | null;
  transitDependencyRedundancyScore: number | null;
  primaryRouteLine: string | null;
  primaryRouteMode: string | null;
  primaryRouteOperator: string | null;
  primaryRouteDependencyShare: number | null;
  primaryStopId: string | null;
  primaryStopDependencyShare: number | null;
  transitDependencyDiagnosis: string | null;
  recommendedGtfsAction: string | null;
};

export type City2graphRouteDependency = {
  line: string | null;
  mode: string | null;
  operator: string | null;
  dependencyShare: number | null;
  rank: number | null;
  meanWaitMin: number | null;
  meanWalkTimeMin: number | null;
  totalFrequencyPerHour: number | null;
};

export type City2graphStopDependency = {
  sapId: string | null;
  routeLines: string | null;
  modes: string | null;
  operators: string | null;
  dependencyShare: number | null;
  rank: number | null;
  meanTotalAccessTimeMin: number | null;
  totalFrequencyPerHour: number | null;
};

export type City2graphNearestAccess = {
  gridId: string | null;
  municipality: string | null;
  matchedGridDistanceM: number | null;
  nearestHealthcareStructureM: number | null;
  nearestPharmacyM: number | null;
  nearestSchoolM: number | null;
  nearestOfficialFoodRetailM: number | null;
  nearestOsmGroceryM: number | null;
  essentialServicesAccessibilityIndex: number | null;
  accessibilityClass: string | null;
  priorityGapClass: string | null;
  serviceDirectDistanceM: number | null;
  ptalDirectDistanceM: number | null;
  gridWalkSnapDistanceM: number | null;
  serviceWalkDistanceM: number | null;
  ptalWalkDistanceM: number | null;
  serviceDetourRatio: number | null;
  ptalDetourRatio: number | null;
  serviceWalkClass: string | null;
  ptalWalkClass: string | null;
  serviceWalkGapScore: number | null;
  ptalWalkGapScore: number | null;
  bcWalkGapScore: number | null;
  mismatchClass: string | null;
};

export type City2graphRelationshipContext = {
  h3Id: string;
  summary: City2graphTransitSummary | null;
  topRoutes: City2graphRouteDependency[];
  topStops: City2graphStopDependency[];
  nearestAccess: City2graphNearestAccess | null;
  contextText: string;
  sources: Array<{ id: string; source: string }>;
};

type RetrieveCity2graphRelationshipsInput = {
  context?: unknown;
  h3Id?: string;
  limit?: number;
  dataRoot?: string;
};

type CsvRecord = Record<string, string>;

const csvCache = new Map<string, Promise<CsvRecord[]>>();

export async function retrieveCity2graphRelationships({
  context,
  h3Id,
  limit = 5,
  dataRoot,
}: RetrieveCity2graphRelationshipsInput): Promise<City2graphRelationshipContext | null> {
  const selectedH3 = normalizeH3Id(h3Id) ?? extractH3IdFromAnalysisContext(context);
  if (!selectedH3) return null;

  const paths = await resolveTransitDependencyPaths(dataRoot);
  if (!paths) return null;
  const selectedCoordinate = extractProjectedCoordinateFromAnalysisContext(context);

  const [summaryRows, routeRows, stopRows] = await Promise.all([
    readCsvRecords(paths.summary),
    readCsvRecords(paths.routes),
    readCsvRecords(paths.stops),
  ]);
  const summaryRow =
    summaryRows.find((row) => normalizeH3Id(row.h3_res9) === selectedH3) ?? null;
  const topRoutes = routeRows
    .filter((row) => normalizeH3Id(row.h3_res9) === selectedH3)
    .map(routeDependencyFromRow)
    .sort(sortByNullableRank)
    .slice(0, limit);
  const topStops = stopRows
    .filter((row) => normalizeH3Id(row.h3_res9) === selectedH3)
    .map(stopDependencyFromRow)
    .sort(sortByNullableRank)
    .slice(0, limit);
  const nearestAccess = selectedCoordinate
    ? await retrieveNearestWalkingAccess(selectedCoordinate, dataRoot)
    : null;

  if (!summaryRow && !topRoutes.length && !topStops.length && !nearestAccess) return null;

  const summary = summaryRow ? transitSummaryFromRow(summaryRow) : null;
  const sources = [
    { id: "city2graph-transit-summary", source: paths.summary },
    { id: "city2graph-route-dependency-edges", source: paths.routes },
    { id: "city2graph-stop-dependency-edges", source: paths.stops },
    ...(nearestAccess && paths.walkingAccess
      ? [{ id: "city2graph-nearest-walking-access", source: paths.walkingAccess }]
      : []),
  ];

  return {
    h3Id: selectedH3,
    summary,
    topRoutes,
    topStops,
    nearestAccess,
    sources,
    contextText: formatCity2graphRelationshipContext({
      h3Id: selectedH3,
      summary,
      topRoutes,
      topStops,
      nearestAccess,
      sources,
    }),
  };
}

function extractH3IdFromAnalysisContext(context: unknown) {
  if (!context || typeof context !== "object") return null;

  const record = context as Record<string, unknown>;
  const scope = readRecord(record.scope);
  const selectedFeature = readRecord(record.selectedFeature);
  const selectedProperties = readRecord(selectedFeature?.properties);
  const candidates = [
    scope?.h3_id,
    scope?.h3Id,
    scope?.h3,
    record.h3_id,
    record.h3Id,
    record.h3,
    selectedProperties?.h3_id,
    selectedProperties?.h3Id,
    selectedProperties?.h3,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeH3Id(candidate);
    if (normalized) return normalized;
  }

  return null;
}

async function resolveTransitDependencyPaths(dataRoot?: string) {
  const candidateRoots = uniqueDefined([
    dataRoot,
    process.env.CITY2GRAPH_TRANSIT_DATA_ROOT,
    ...candidateBaseDirs().flatMap((baseDir) => [
      path.join(
        baseDir,
        "city2graphy_milano",
        "gtfs_netex_transit_dependency_graph",
        "outputs",
        "data",
      ),
      path.join(baseDir, "data", "city2graph", "transit_dependency"),
    ]),
  ]);

  for (const root of candidateRoots) {
    const paths = {
      summary: path.join(root, "h3_res9_transit_dependency.csv"),
      routes: path.join(root, "h3_to_route_dependency_edges.csv"),
      stops: path.join(root, "h3_to_stop_dependency_edges.csv"),
      walkingAccess: path.join(root, "milan_bc_walking_network_access.csv"),
    };
    if (await pathsExist([paths.summary, paths.routes, paths.stops])) {
      return {
        ...paths,
        walkingAccess: (await pathsExist([paths.walkingAccess]))
          ? paths.walkingAccess
          : await resolveWalkingAccessPath(dataRoot),
      };
    }
  }

  return null;
}

async function resolveWalkingAccessPath(dataRoot?: string) {
  const candidates = uniqueDefined([
    dataRoot ? path.join(dataRoot, "milan_bc_walking_network_access.csv") : null,
    process.env.CITY2GRAPH_WALKING_ACCESS_CSV,
    ...candidateBaseDirs().flatMap((baseDir) => [
      path.join(
        baseDir,
        "city2graphy_milano",
        "outputs",
        "walking_network_bc_full",
        "milan_bc_walking_network_access.csv",
      ),
      path.join(
        baseDir,
        "data",
        "city2graph",
        "walking_network",
        "milan_bc_walking_network_access.csv",
      ),
    ]),
  ]);

  for (const candidate of candidates) {
    if (await pathsExist([candidate])) return candidate;
  }

  return null;
}

function candidateBaseDirs() {
  const cwd = process.cwd();

  return uniqueDefined([
    cwd,
    path.join(cwd, ".."),
    path.join(cwd, "..", ".."),
    path.join(cwd, "..", "..", ".."),
  ]).map((dir) => path.resolve(dir));
}

function uniqueDefined(candidates: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      candidates
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => path.resolve(candidate)),
    ),
  );
}

async function pathsExist(paths: string[]) {
  try {
    await Promise.all(paths.map((filePath) => fs.access(filePath)));
    return true;
  } catch {
    return false;
  }
}

async function readCsvRecords(filePath: string) {
  const cached = csvCache.get(filePath);
  if (cached) return cached;

  const promise = fs.readFile(filePath, "utf8").then(parseCsv);
  csvCache.set(filePath, promise);
  return promise;
}

function parseCsv(csv: string): CsvRecord[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell);
  return cells.map((value) => value.trim());
}

function transitSummaryFromRow(row: CsvRecord): City2graphTransitSummary {
  return {
    h3Id: row.h3_res9,
    routeCount: readNumber(row.route_count),
    stopCount: readNumber(row.stop_count),
    modeCount: readNumber(row.mode_count),
    meanWaitMin: readNumber(row.mean_wait_min),
    meanWalkMin: readNumber(row.mean_walk_min),
    routeDependencyHhi: readNumber(row.route_dependency_hhi),
    transitDependencyRedundancyScore: readNumber(
      row.transit_dependency_redundancy_score,
    ),
    primaryRouteLine: readString(row.primary_route_line),
    primaryRouteMode: readString(row.primary_route_mode),
    primaryRouteOperator: readString(row.primary_route_operator),
    primaryRouteDependencyShare: readNumber(row.primary_route_dependency_share),
    primaryStopId: readString(row.primary_stop_id),
    primaryStopDependencyShare: readNumber(row.primary_stop_dependency_share),
    transitDependencyDiagnosis: readString(row.transit_dependency_diagnosis),
    recommendedGtfsAction: readString(row.recommended_gtfs_action),
  };
}

function routeDependencyFromRow(row: CsvRecord): City2graphRouteDependency {
  return {
    line: readString(row.line),
    mode: readString(row.mode),
    operator: readString(row.operator),
    dependencyShare: readNumber(row.route_dependency_share),
    rank: readNumber(row.route_rank_in_h3),
    meanWaitMin: readNumber(row.mean_wait_min),
    meanWalkTimeMin: readNumber(row.mean_walk_time_min),
    totalFrequencyPerHour: readNumber(row.total_freq_per_hour),
  };
}

function stopDependencyFromRow(row: CsvRecord): City2graphStopDependency {
  return {
    sapId: readString(row.sap_id),
    routeLines: readString(row.route_lines),
    modes: readString(row.modes),
    operators: readString(row.operators),
    dependencyShare: readNumber(row.stop_dependency_share),
    rank: readNumber(row.stop_rank_in_h3),
    meanTotalAccessTimeMin: readNumber(row.mean_total_access_time_min),
    totalFrequencyPerHour: readNumber(row.total_freq_per_hour),
  };
}

async function retrieveNearestWalkingAccess(
  coordinate: { x: number; y: number },
  dataRoot?: string,
) {
  const walkingPath = await resolveWalkingAccessPath(dataRoot);
  if (!walkingPath) return null;

  const rows = await readCsvRecords(walkingPath);
  let nearestRow: CsvRecord | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const x = readNumber(row.centroid_x);
    const y = readNumber(row.centroid_y);
    if (x == null || y == null) continue;

    const distanceSquared = (x - coordinate.x) ** 2 + (y - coordinate.y) ** 2;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestRow = row;
    }
  }

  return nearestRow
    ? nearestAccessFromRow(nearestRow, Math.sqrt(nearestDistanceSquared))
    : null;
}

function nearestAccessFromRow(
  row: CsvRecord,
  matchedGridDistanceM: number,
): City2graphNearestAccess {
  return {
    gridId: readString(row.grid_id),
    municipality: readString(row.COMUNE),
    matchedGridDistanceM,
    nearestHealthcareStructureM: readNumber(row.nearest_healthcare_structure_m),
    nearestPharmacyM: readNumber(row.nearest_pharmacy_m),
    nearestSchoolM: readNumber(row.nearest_school_m),
    nearestOfficialFoodRetailM: readNumber(row.nearest_official_food_retail_m),
    nearestOsmGroceryM: readNumber(row.nearest_osm_grocery_m),
    essentialServicesAccessibilityIndex: readNumber(row.essential_services_accessibility_index),
    accessibilityClass: readString(row.accessibility_class),
    priorityGapClass: readString(row.priority_gap_class),
    serviceDirectDistanceM: readNumber(row.service_direct_distance_m),
    ptalDirectDistanceM: readNumber(row.ptal_direct_distance_m),
    gridWalkSnapDistanceM: readNumber(row.grid_walk_snap_distance_m),
    serviceWalkDistanceM: readNumber(row.service_walk_distance_m),
    ptalWalkDistanceM: readNumber(row.ptal_walk_distance_m),
    serviceDetourRatio: readNumber(row.service_detour_ratio),
    ptalDetourRatio: readNumber(row.ptal_detour_ratio),
    serviceWalkClass: readString(row.service_walk_class),
    ptalWalkClass: readString(row.ptal_walk_class),
    serviceWalkGapScore: readNumber(row.service_walk_gap_score),
    ptalWalkGapScore: readNumber(row.ptal_walk_gap_score),
    bcWalkGapScore: readNumber(row.bc_walk_gap_score),
    mismatchClass: readString(row.bc_service_ptal_mismatch_class),
  };
}

function sortByNullableRank<T extends { rank: number | null }>(left: T, right: T) {
  return (left.rank ?? Number.POSITIVE_INFINITY) - (right.rank ?? Number.POSITIVE_INFINITY);
}

function formatCity2graphRelationshipContext({
  h3Id,
  summary,
  topRoutes,
  topStops,
  nearestAccess,
  sources,
}: Omit<City2graphRelationshipContext, "contextText">) {
  const parts = [
    `[transit-dependency-relationships] Structured current H3 Transit dependency relationships`,
    `Source evidence: transit summary, route and stop dependency evidence${sources.some((source) => source.id.includes("nearest-walking-access")) ? ", nearest walking-access grid" : ""}`,
    `H3: ${h3Id}`,
  ];

  if (summary) {
    parts.push(
      [
        `Transit dependency summary: ${summary.transitDependencyDiagnosis ?? "n/a"}.`,
        `Primary route: ${summary.primaryRouteLine ?? "n/a"} (${summary.primaryRouteMode ?? "n/a"}, ${summary.primaryRouteOperator ?? "n/a"}) with ${formatShare(summary.primaryRouteDependencyShare)} dependency share.`,
        `Primary stop: ${summary.primaryStopId ?? "n/a"} with ${formatShare(summary.primaryStopDependencyShare)} dependency share.`,
        `Network evidence: ${formatCount(summary.routeCount)} routes, ${formatCount(summary.stopCount)} stops, ${formatCount(summary.modeCount)} modes, mean wait ${formatMinutes(summary.meanWaitMin)}, mean walk ${formatMinutes(summary.meanWalkMin)}, redundancy score ${formatNumber(summary.transitDependencyRedundancyScore)}.`,
        `Recommended GTFS action: ${summary.recommendedGtfsAction ?? "n/a"}.`,
      ].join(" "),
    );
  }

  if (topRoutes.length) {
    parts.push(
      [
        "Top route dependency edges:",
        "| Route rank | Line | Mode | Operator | Share | Wait | Frequency |",
        "|---:|---|---|---|---:|---:|---:|",
        ...topRoutes.map(
          (route) =>
            `| ${formatCount(route.rank)} | ${route.line ?? "n/a"} | ${route.mode ?? "n/a"} | ${route.operator ?? "n/a"} | ${formatShare(route.dependencyShare)} | ${formatMinutes(route.meanWaitMin)} | ${formatFrequency(route.totalFrequencyPerHour)} |`,
        ),
      ].join("\n"),
    );
  }

  if (topStops.length) {
    parts.push(
      [
        "Top stop dependency edges:",
        "| Stop rank | Stop / SAP | Routes | Modes | Operator | Share | Access time | Frequency |",
        "|---:|---|---|---|---|---:|---:|---:|",
        ...topStops.map(
          (stop) =>
            `| ${formatCount(stop.rank)} | ${stop.sapId ?? "n/a"} | ${stop.routeLines ?? "n/a"} | ${stop.modes ?? "n/a"} | ${stop.operators ?? "n/a"} | ${formatShare(stop.dependencyShare)} | ${formatMinutes(stop.meanTotalAccessTimeMin)} | ${formatFrequency(stop.totalFrequencyPerHour)} |`,
        ),
      ].join("\n"),
    );
  }

  if (nearestAccess) {
    parts.push(
      [
        "Nearest walking-access grid evidence:",
        `Matched 100 m grid: ${nearestAccess.gridId ?? "n/a"} (${nearestAccess.municipality ?? "n/a"}), ${formatMeters(nearestAccess.matchedGridDistanceM)} from selected map coordinate.`,
        "| Measure | Value |",
        "|---|---:|",
        `| Nearest healthcare | ${formatMeters(nearestAccess.nearestHealthcareStructureM)} |`,
        `| Nearest pharmacy | ${formatMeters(nearestAccess.nearestPharmacyM)} |`,
        `| Nearest school | ${formatMeters(nearestAccess.nearestSchoolM)} |`,
        `| Nearest official food retail | ${formatMeters(nearestAccess.nearestOfficialFoodRetailM)} |`,
        `| Nearest OSM grocery | ${formatMeters(nearestAccess.nearestOsmGroceryM)} |`,
        `| Service direct distance | ${formatMeters(nearestAccess.serviceDirectDistanceM)} |`,
        `| PTAL direct distance | ${formatMeters(nearestAccess.ptalDirectDistanceM)} |`,
        `| Service walking-network distance | ${formatMeters(nearestAccess.serviceWalkDistanceM)} |`,
        `| PTAL walking-network distance | ${formatMeters(nearestAccess.ptalWalkDistanceM)} |`,
        `| Service detour ratio | ${formatRatio(nearestAccess.serviceDetourRatio)} |`,
        `| PTAL detour ratio | ${formatRatio(nearestAccess.ptalDetourRatio)} |`,
        `| B/C mismatch class | ${nearestAccess.mismatchClass ?? "n/a"} |`,
      ].join("\n"),
    );
  }

  return parts.join("\n\n");
}

function extractProjectedCoordinateFromAnalysisContext(context: unknown) {
  if (!context || typeof context !== "object") return null;

  const record = context as Record<string, unknown>;
  const scopeRecord = readRecord(record.scope);
  const coordinateSources = [scopeRecord, record].filter(
    (source): source is Record<string, unknown> => Boolean(source),
  );

  for (const source of coordinateSources) {
    const projected = readRecord(source.selected_coordinate_projected);
    if (projected) {
      const x = readFiniteNumber(projected.x);
      const y = readFiniteNumber(projected.y);
      if (x != null && y != null) return { x, y };
    }
  }

  for (const source of coordinateSources) {
    const coordinate = readRecord(source.selected_coordinate);
    if (coordinate) {
      const longitude =
        readFiniteNumber(coordinate.longitude) ?? readFiniteNumber(coordinate.lon);
      const latitude =
        readFiniteNumber(coordinate.latitude) ?? readFiniteNumber(coordinate.lat);
      if (longitude != null && latitude != null) {
        return projectLonLatToUtm32(longitude, latitude);
      }
    }
  }

  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFiniteNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function projectLonLatToUtm32(longitude: number, latitude: number) {
  const a = 6378137;
  const eccSquared = 0.0066943799901413165;
  const k0 = 0.9996;
  const longitudeOrigin = 9;
  const latRad = degreesToRadians(latitude);
  const lonRad = degreesToRadians(longitude);
  const lonOriginRad = degreesToRadians(longitudeOrigin);
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const n = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2);
  const t = Math.tan(latRad) ** 2;
  const c = eccPrimeSquared * Math.cos(latRad) ** 2;
  const aa = Math.cos(latRad) * (lonRad - lonOriginRad);
  const m =
    a *
    ((1 -
      eccSquared / 4 -
      (3 * eccSquared ** 2) / 64 -
      (5 * eccSquared ** 3) / 256) *
      latRad -
      ((3 * eccSquared) / 8 +
        (3 * eccSquared ** 2) / 32 +
        (45 * eccSquared ** 3) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * eccSquared ** 2) / 256 + (45 * eccSquared ** 3) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * eccSquared ** 3) / 3072) * Math.sin(6 * latRad));

  const x =
    k0 *
      n *
      (aa +
        ((1 - t + c) * aa ** 3) / 6 +
        ((5 - 18 * t + t ** 2 + 72 * c - 58 * eccPrimeSquared) * aa ** 5) /
          120) +
    500000;
  const y =
    k0 *
    (m +
      n *
        Math.tan(latRad) *
        (aa ** 2 / 2 +
          ((5 - t + 9 * c + 4 * c ** 2) * aa ** 4) / 24 +
          ((61 - 58 * t + t ** 2 + 600 * c - 330 * eccPrimeSquared) *
            aa ** 6) /
            720));

  return { x, y };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeH3Id(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function readString(value: string | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function readNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCount(value: number | null) {
  return value == null ? "n/a" : Math.round(value).toString();
}

function formatNumber(value: number | null) {
  return value == null ? "n/a" : Number(value.toFixed(2)).toString();
}

function formatShare(value: number | null) {
  return value == null ? "n/a" : `${Number((value * 100).toFixed(1))}%`;
}

function formatMinutes(value: number | null) {
  return value == null ? "n/a" : `${Number(value.toFixed(1))} min`;
}

function formatFrequency(value: number | null) {
  return value == null ? "n/a" : `${Number(value.toFixed(1))}/h`;
}

function formatMeters(value: number | null) {
  return value == null ? "n/a" : `${Number(value.toFixed(1))} m`;
}

function formatRatio(value: number | null) {
  return value == null ? "n/a" : Number(value.toFixed(2)).toString();
}
