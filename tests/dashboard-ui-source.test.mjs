import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePath = new URL("../src/components/milan-layer-viewer.tsx", import.meta.url);

async function loadDashboardSource() {
  return readFile(sourcePath, "utf8");
}

test("analysis chat exposes recommended questions through a drawer", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /Recommended questions/);
  assert.match(source, /aria-expanded=\{showPresets\}/);
  assert.match(source, /setShowPresets\(\(open\) => !open\)/);
  assert.match(source, /const \[prompt, setPrompt\] = React\.useState\(""\)/);
});

test("analysis chat groups recommended questions by category with AI prompt templates", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /const ANALYSIS_PRESET_CATEGORIES = \[/);
  assert.match(source, /label: "Why is this area high priority\?"/);
  assert.match(source, /prompt:\s*"What makes this area high priority\?/);
  assert.match(source, /label: "Which stops and routes matter\?"/);
  assert.match(source, /prompt:\s*"Which stops and routes matter here\?/);
  assert.match(source, /id: "data"/);
  assert.match(source, /label: "Data"/);
  assert.match(source, /label: "Where do these data come from\?"/);
  assert.match(source, /prompt:\s*"Where do the dashboard data come from\?/);
  assert.match(source, /label: "How should I use these data\?"/);
  assert.match(source, /label: "How are the scores calculated\?"/);
  assert.match(source, /label: "What should be validated first\?"/);
  assert.match(source, /grid-cols-5/);
  assert.match(source, /const \[activePresetCategoryId, setActivePresetCategoryId\]/);
  assert.match(source, /activePresetCategory\.questions\.map/);
  assert.match(source, /choosePreset\(preset\)/);
  assert.doesNotMatch(source, /label: "为什么这个区域优先级高？"/);
});

test("analysis chat keeps the Data preset list as compact as the other categories", async () => {
  const source = await loadDashboardSource();
  const dataCategory = source.match(/id: "data"[\s\S]*?\n  },\n\] satisfies AnalysisPresetCategory\[\];/)?.[0];

  assert.ok(dataCategory, "expected data preset category source");
  assert.equal(dataCategory.match(/\n\s+prompt:/g)?.length, 4);
  assert.doesNotMatch(dataCategory, /label: "How is SVI calculated\?"/);
  assert.doesNotMatch(dataCategory, /label: "How is DCS calculated\?"/);
});

test("analysis preset prompts use public transit dependency wording", async () => {
  const source = await loadDashboardSource();
  const presetSource = source.match(/const ANALYSIS_PRESET_CATEGORIES = \[[\s\S]*?\] satisfies AnalysisPresetCategory\[\];/)?.[0];

  assert.ok(presetSource, "expected analysis preset category source");
  assert.doesNotMatch(presetSource, /city2graph/i);
  assert.match(presetSource, /route and stop dependency evidence/);
  assert.match(presetSource, /route\/stop dependency evidence/);
  assert.match(presetSource, /transit dependency evidence/);
});

test("analysis model pill keeps model and provider inline without a dropdown", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /data-analysis-active-model/);
  assert.match(source, /\{activeModel\}/);
  assert.match(source, /\{llmSettings\.provider \|\| DEFAULT_LLM_SETTINGS\.provider\}/);
  assert.doesNotMatch(source, /DropdownMenuTrigger/);
  assert.doesNotMatch(source, /DropdownMenuContent/);
  assert.doesNotMatch(source, /Configured in Settings/);
  assert.doesNotMatch(source, /Provider: \{llmSettings\.provider/);
});

test("llm settings normalization restores Xiaomi defaults for the default provider", async () => {
  const source = await loadDashboardSource();

  assert.match(
    source,
    /if \(provider === DEFAULT_LLM_SETTINGS\.provider\) \{\s*return \{\s*\.\.\.DEFAULT_LLM_SETTINGS,\s*enabled: Boolean\(settings\.enabled\),\s*\};\s*\}/,
  );
  assert.match(
    source,
    /const preset =\s*LLM_PROVIDER_PRESETS\[provider\] \?\? LLM_PROVIDER_PRESETS\.xiaomi/,
  );
});

test("dashboard priority gauge avoids clipped fixed widths and hidden point markers", async () => {
  const source = await loadDashboardSource();

  assert.doesNotMatch(source, /<circle cx="60" cy="64" r="4" fill=\{color\} \/>/);
  assert.match(source, /text-sm font-semibold/);
  assert.match(source, /minmax\(7\.25rem,1fr\)/);
});

test("analysis chat keeps long questions and markdown tables within the narrow panel", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /w-full min-w-0 max-w-full/);
  assert.match(source, /w-full min-w-0 overflow-hidden rounded-2xl/);
  assert.match(source, /overflow-auto overscroll-contain/);
  assert.match(source, /break-words/);
  assert.match(source, /data-analysis-table-rail/);
  assert.match(source, /data-analysis-chat-scroll/);
  assert.match(source, /max-h-\[min\(16rem,calc\(100svh-22rem\)\)\]/);
});

test("analysis dashboard uses shorter mobile panels so AI controls stay reachable", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /min-h-\[18rem\] sm:min-h-\[22rem\] lg:order-none lg:col-start-1/);
  assert.match(source, /min-h-\[18rem\] sm:min-h-\[22rem\] lg:order-none lg:col-start-2/);
  assert.match(source, /min-h-\[16rem\] sm:min-h-\[18rem\] lg:order-none lg:col-start-1/);
  assert.match(source, /panelMode === "chat" \? "order-3" : "order-2"/);
  assert.match(source, /panelMode === "chat" \? "order-1" : "order-3"/);
  assert.match(source, /panelMode === "chat" \? "order-2" : "order-1"/);
  assert.match(source, /max-h-\[min\(16rem,calc\(100svh-22rem\)\)\]/);
  assert.doesNotMatch(source, /order-2 min-h-\[22rem\] lg:order-none/);
  assert.doesNotMatch(source, /order-3 min-h-\[22rem\] lg:order-none/);
});

test("analysis chat fills the desktop side panel while keeping controls pinned", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /<AnalysisChatBox\s+className="h-full min-h-0"/);
  assert.match(source, /data-analysis-chat-box/);
  assert.match(source, /data-analysis-chat-scroll[\s\S]{0,220}lg:max-h-none/);
  assert.match(source, /data-analysis-chat-scroll[\s\S]{0,220}lg:flex-1/);
  assert.match(source, /data-analysis-chat-presets/);
  assert.match(source, /data-analysis-chat-input/);
  assert.match(source, /data-analysis-chat-scroll[\s\S]{0,180}max-h-\[min\(16rem,calc\(100svh-22rem\)\)\]/);
});

test("analysis markdown tables render in a bounded chat-width table viewport", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /function AnalysisMarkdownTable/);
  assert.match(source, /function AnalysisTableRail/);
  assert.match(source, /data-analysis-table-shell/);
  assert.match(source, /grid w-full min-w-0 max-w-full grid-rows-\[auto_minmax\(0,1fr\)\] overflow-hidden/);
  assert.match(source, /data-analysis-table-viewport/);
  assert.match(source, /max-h-\[min\(24rem,56vh\)\] w-full min-w-0 max-w-full overflow-auto overscroll-contain/);
  assert.match(source, /data-analysis-table-scroll/);
  assert.match(source, /data-analysis-table-rail/);
  assert.match(source, /gridTemplateColumns: `repeat\(\$\{block\.headers\.length\}, minmax\(10rem, 14rem\)\)`/);
  assert.match(source, /grid w-max min-w-full/);
  assert.match(source, /cursor-grab active:cursor-grabbing/);
  assert.match(source, /<span>Table<\/span>/);
  assert.doesNotMatch(source, /inline-grid min-w-max/);
  assert.doesNotMatch(source, /Drag table/);
  assert.doesNotMatch(source, /<table className=/);
});

test("analysis chat renders formula math blocks and inline math", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /block\.type === "math"/);
  assert.match(source, /tokenizeFormulaText/);
  assert.match(source, /data-analysis-formula-rendered/);
  assert.match(source, /data-analysis-math-block/);
  assert.match(source, /data-analysis-inline-math/);
  assert.match(source, /data-analysis-formula-block/);
  assert.doesNotMatch(source, /font-mono text-\[12px\] leading-6 whitespace-pre/);
  assert.doesNotMatch(source, /\{textContent\}\s*<\/code>/);
  assert.match(source, /function isFormulaLabel/);
  assert.match(source, /function extractInlineFormula/);
  assert.match(source, /\\\$\[\^\$\\n\]\+\\\$/);
  assert.match(source, /using markdown display math/);
});

test("analysis tables expose an expand dialog with the full table", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /Maximize2/);
  assert.match(source, /DialogTrigger/);
  assert.match(source, /DialogContent/);
  assert.match(source, /DialogTitle/);
  assert.match(source, /data-analysis-table-expand/);
  assert.match(source, /aria-label="Expand table"/);
  assert.match(source, /max-w-\[min\(72rem,calc\(100vw-2rem\)\)\]/);
  assert.match(source, /max-h-\[min\(42rem,calc\(100vh-2rem\)\)\]/);
  assert.match(source, /theme === "dark" \? "dark" : ""/);
  assert.match(source, /<AnalysisChatBox[\s\S]*theme=\{theme\}/);
  assert.match(source, /<AnalysisMarkdownTable[\s\S]*theme=\{theme\}/);
});

test("analysis prose renders as readable body copy instead of bolding whole label paragraphs", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /function renderParagraphMarkdown/);
  assert.match(source, /text-\[13px\] leading-6 font-normal/);
  assert.match(source, /const labelMatch =/);
  assert.match(source, /renderParagraphMarkdown\(block\.text, muted\)/);
  assert.doesNotMatch(source, /block\.emphasis \? "font-medium text-foreground" : "text-foreground\/90"/);
});

test("analysis chat keeps markdown lists as simple readable lists", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /<ol\s+key=\{index\}/);
  assert.match(source, /<ul\s+key=\{index\}/);
  assert.match(source, /list-decimal/);
  assert.match(source, /renderParagraphMarkdown\(item, muted\)/);
  assert.doesNotMatch(source, /function AnalysisBulletCardList/);
  assert.doesNotMatch(source, /function AnalysisStepList/);
  assert.doesNotMatch(source, /data-analysis-card-list/);
  assert.doesNotMatch(source, /data-analysis-step-list/);
});

test("analysis chat commits final streamed decoder tail", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /answer \+= decoder\.decode\(\);/);
  assert.match(source, /const finalAnswer = answer;/);
  assert.match(source, /content: finalAnswer/);
});

test("dashboard score bars keep the row list and open formula details in a dialog", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /function DashboardScoreFormulaDialog/);
  assert.match(source, /\/api\/analysis\/score-formula/);
  assert.match(source, /formulaDetails/);
  assert.match(source, /Score contribution/);
  assert.match(source, /<Dialog open=\{open\} onOpenChange=\{setOpen\}>/);
  assert.match(source, /<DialogTrigger asChild>/);
  assert.match(source, /aria-label=\{`Open \$\{label\} formula details`\}/);
  assert.match(source, /<DialogContent className="max-h-\[min\(34rem,calc\(100vh-2rem\)\)\]/);
  assert.doesNotMatch(source, /const \[expandedScoreKey, setExpandedScoreKey\]/);
  assert.doesNotMatch(source, /function DashboardScoreFormulaPanel/);
  assert.doesNotMatch(source, /aria-expanded=\{expanded\}/);
  assert.doesNotMatch(source, /setExpandedScoreKey\(\(current\) =>/);
});

test("dashboard score breakdown uses full report index names", async () => {
  const source = await loadDashboardSource();
  const start = source.indexOf("breakdown: [");
  const end = source.indexOf("scenarios:", start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const breakdownSource = source.slice(start, end);

  assert.match(breakdownSource, /label: "Social Vulnerability Index"/);
  assert.match(breakdownSource, /label: "Public Transport Deficit"/);
  assert.match(breakdownSource, /label: "Essential Services Deficit"/);
  assert.match(breakdownSource, /label: "EO-Territorial Disadvantage Index"/);
  assert.doesNotMatch(breakdownSource, /label: "Social vulnerability"/);
  assert.doesNotMatch(breakdownSource, /label: "PTAL deficit"/);
  assert.doesNotMatch(breakdownSource, /label: "Essential services deficit"/);
  assert.doesNotMatch(breakdownSource, /label: "EO territorial disadvantage"/);
});

test("dashboard stacks panels and removes fixed-width score rows on mobile", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /overflow-y-auto lg:overflow-hidden/);
  assert.match(source, /grid min-h-full w-full min-w-0 gap-1\.5/);
  assert.match(source, /grid-cols-1/);
  assert.match(source, /lg:grid-cols-\[minmax\(390px,0\.42fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_3rem\] sm:grid-cols-\[minmax\(11rem,0\.62fr\)_minmax\(6rem,1fr\)_3rem\]/);
  assert.match(source, /lg:grid-cols-\[minmax\(13rem,0\.52fr\)_minmax\(8rem,1fr\)_3rem\]/);
  assert.match(source, /grid-cols-1 items-center gap-1 overflow-hidden sm:grid-cols-\[minmax\(148px,0\.9fr\)_minmax\(7\.25rem,1fr\)\]/);
  assert.match(source, /className="flex min-h-0 min-w-0 flex-col justify-center gap-2 overflow-hidden"/);
  assert.match(source, /className=\{cn\(\s*"grid min-w-0 w-full max-w-full items-center gap-x-3 gap-y-2 overflow-hidden/);
  assert.doesNotMatch(source, /lg:grid-cols-\[16rem_minmax\(0,1fr\)_2\.5rem\]/);
});

test("strict vulnerability layer uses its SVI value directly when no rank field exists", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /const rankProperty = layer\.thematicRankProperty \?\? null;/);
  assert.match(source, /const rankProperty =\s*feature\.layer\.thematicRankProperty \?\? null;/);
  assert.doesNotMatch(source, /\$\{layer\.thematicProperty\}_pct_rank/);
  assert.doesNotMatch(source, /\$\{feature\.layer\.thematicProperty\}_pct_rank/);
  assert.match(source, /"fill-color": isContextPolygon\s*\?\s*"rgba\(255,255,255,0\)"/);
  assert.match(source, /"fill-opacity": isContextPolygon\s*\?\s*0/);
});

test("strict component layers use the correct continuous and categorical legends", async () => {
  const source = await loadDashboardSource();

  const expectedLegendLayerIds = [
    "ptal-public-transport-accessibility",
    "ptal-service-frequency",
    "ptal-line-availability",
    "ptal-ptal-ptol-component",
    "services-essential-services-accessibility",
    "services-health-access",
    "services-school-access",
    "services-job-access",
    "services-grocery-access",
    "earth-observation-population-demand",
    "earth-observation-built-up-density",
    "earth-observation-artificial-land-cover",
    "earth-observation-artificial-land-cover-100m",
    "earth-observation-nighttime-lights",
    "earth-observation-nighttime-lights-100m",
    "earth-observation-road-density",
    "earth-observation-intersection-density",
    "earth-observation-road-connectivity",
    "earth-observation-green-land",
    "earth-observation-urban-growth",
  ];

  for (const layerId of expectedLegendLayerIds) {
    assert.match(source, new RegExp(`"${layerId}": \\{[\\s\\S]*stops: \\[`));
  }

  const continuousLegendSource = source.slice(
    source.indexOf("const PUBLIC_TRANSPORT_CONTINUOUS_LEGENDS"),
    source.indexOf("const PUBLIC_TRANSPORT_CATEGORY_LEGENDS"),
  );

  assert.doesNotMatch(continuousLegendSource, /"ptal-ptal-component"/);
  assert.doesNotMatch(continuousLegendSource, /"ptal-ptol-component"/);
  assert.match(source, /const PUBLIC_TRANSPORT_CATEGORY_LEGENDS/);
  assert.match(source, /"ptal-ptal-component": \{[\s\S]*label: "Public Transport Accessibility Level \(PTAL\)"/);
  assert.match(source, /"ptal-ptal-detailed": \{[\s\S]*label: "Public Transport Accessibility Level \(PTAL, 250m\)"/);
  assert.match(source, /"ptal-ptal-detailed": \{[\s\S]*property: "ptal_order"/);
  assert.match(source, /"ptal-ptal-100m-gtfs-netex": \{[\s\S]*label: "Public Transport Accessibility Level \(PTAL, 100m GTFS\/NeTEx\)"/);
  assert.match(source, /"ptal-ptal-100m-gtfs-netex": \{[\s\S]*property: "ptal"/);
  assert.match(source, /"ptal-ptal-component": \{[\s\S]*label: "1a"/);
  assert.match(source, /"ptal-ptal-component": \{[\s\S]*label: "6b"/);
  assert.match(source, /"ptal-ptol-component": \{[\s\S]*label: "Public Transport Opportunity Level \(PTOL\)"/);
  assert.match(source, /"ptal-ptol-detailed": \{[\s\S]*label: "Public Transport Opportunity Level \(PTOL, 250m\)"/);
  assert.match(source, /"ptal-ptol-detailed": \{[\s\S]*property: "ptol"/);
  assert.match(source, /"ptal-ptol-100m-gtfs-netex": \{[\s\S]*label: "Public Transport Opportunity Level \(PTOL, 100m GTFS\/NeTEx\)"/);
  assert.match(source, /"ptal-ptol-100m-gtfs-netex": \{[\s\S]*property: "ptol"/);
  assert.match(source, /"ptal-ptol-component": \{[\s\S]*label: "4"/);
  assert.match(source, /publicTransportCategoryColor/);
  assert.match(source, /publicTransportCategoricalColorFromValue/);
});

test("vulnerability layers use per-layer palettes and no-population cells as no data", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /teal: \["#e0f2f1", "#5fb7ad", "#0f766e"\]/);
  assert.match(source, /indigo: \["#e0e7ff", "#818cf8", "#4338ca"\]/);
  assert.match(source, /"total_ghsl_population_count"/);
  assert.match(source, /\["<=", \["to-number", \["get", "total_ghsl_population_count"\], -1\], 0\]/);
});

test("GTFS and NeTEx stops are styled and explained by dominant mode", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /const STOP_MODE_CLASSES = \[/);
  assert.match(source, /value: "bus"[\s\S]*label: "Bus"/);
  assert.match(source, /value: "tram"[\s\S]*label: "Tram"/);
  assert.match(source, /value: "metro"[\s\S]*label: "Metro"/);
  assert.match(source, /value: "rail"[\s\S]*label: "Rail"/);
  assert.match(source, /function pointLayerColor/);
  assert.match(source, /\["to-string", \["get", "dominant_mode"\]\]/);
  assert.match(source, /const pointColor = pointLayerColor\(layer, displayColor\);/);
  assert.match(source, /stopModeClasses\(activeLayer\)/);
});

test("essential service points are styled and explained by service category", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /const SERVICE_POINT_CLASSES = \[/);
  assert.match(source, /value: "healthcare_structure"[\s\S]*label: "Healthcare"/);
  assert.match(source, /value: "pharmacy"[\s\S]*label: "Pharmacy"/);
  assert.match(source, /value: "school"[\s\S]*label: "School"/);
  assert.match(source, /value: "official_food_retail"[\s\S]*label: "Official food retail"/);
  assert.match(source, /value: "osm_grocery"[\s\S]*label: "Grocery"/);
  assert.match(source, /servicePointClasses\(activeLayer\)/);
  assert.match(source, /\["to-string", \["get", "category"\]\]/);
});

test("dashboard header keeps only the active section label", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /<nav className="flex min-w-0 items-center gap-2 text-sm">\s*<span className="truncate font-medium">\{activeFunction\.label\}<\/span>\s*<\/nav>/);
  assert.doesNotMatch(source, /<span className="truncate text-muted-foreground">Milan GIS<\/span>/);
  assert.doesNotMatch(source, /ChevronRight/);
});

test("recommendation panel lightbulb uses yellow emphasis", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /bg-yellow-400\/15/);
  assert.match(source, /text-yellow-500/);
  assert.match(source, /dark:text-yellow-300/);
  assert.doesNotMatch(source, /rounded-xl bg-primary\/10 text-primary">\s*<Lightbulb/);
});

test("score formula dialog keeps the content to shadcn progress bars", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /import \{ Progress \} from "@\/components\/ui\/progress"/);
  assert.match(source, /function ScoreContributionBar/);
  assert.match(source, /function ScoreOnlyDisplay/);
  assert.match(source, /<Progress/);
  assert.match(source, /value=\{barValue\}/);
  assert.match(source, /<ScoreOnlyDisplay/);
  assert.doesNotMatch(source, /<DialogHeader className="border-b px-5 py-4 pr-12">/);
  assert.doesNotMatch(source, /<DialogDescription>\{scopeLabel\}<\/DialogDescription>/);
  assert.doesNotMatch(source, /label="Displayed score"[\s\S]*<ScoreContributionBar/);
  assert.doesNotMatch(source, /<h3 className="text-sm font-semibold">Formula<\/h3>/);
  assert.doesNotMatch(source, /<h3 className="text-sm font-semibold">Source values<\/h3>/);
  assert.doesNotMatch(source, /details\.notes\.map/);
});

test("score formula dialog shows PTA and component source values", async () => {
  const source = await loadDashboardSource();
  const dialogSource = source.slice(
    source.indexOf("function DashboardScoreFormulaDialog"),
    source.indexOf("function ScoreBreakdownIcon"),
  );

  assert.match(dialogSource, /details\.sourceValues\.length/);
  assert.match(dialogSource, /ScoreComponentValue/);
  assert.match(dialogSource, /Formula inputs/);
});

test("score formula dialog provides an accessible description without visible helper copy", async () => {
  const source = await loadDashboardSource();
  const dialogSource = source.slice(
    source.indexOf("function DashboardScoreFormulaDialog"),
    source.indexOf("function ScoreContributionBar"),
  );

  assert.match(dialogSource, /<DialogDescription className="sr-only">/);
  assert.match(dialogSource, /Score formula details for \{label\}\./);
  assert.doesNotMatch(dialogSource, /<DialogDescription>\{scopeLabel\}<\/DialogDescription>/);
});

test("analysis report export opens the print window before asynchronous fetch work", async () => {
  const source = await loadDashboardSource();
  const exportSource = source.slice(
    source.indexOf("async function exportAnalysisReport"),
    source.indexOf("function buildAnalysisReportHtml"),
  );
  const openIndex = exportSource.indexOf("const reportWindow = window.open");
  const fetchIndex = exportSource.indexOf("const response = await fetch");

  assert.ok(openIndex > -1, "report export should call window.open");
  assert.ok(fetchIndex > -1, "report export should fetch report context");
  assert.ok(
    openIndex < fetchIndex,
    "window.open must run before await fetch so popup blockers keep the user activation",
  );
});

test("score formula dialog avoids nested box containers inside the popup body", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /className="max-h-\[min\(28rem,calc\(100vh-4rem\)\)\] overflow-y-auto px-5 py-5"/);
  assert.match(source, /className="flex items-baseline justify-between gap-4 py-1"/);
  assert.match(source, /<div className="space-y-3">/);
  assert.doesNotMatch(source, /expanded && "bg-muted\/40 ring-1 ring-foreground\/25"/);
  assert.doesNotMatch(source, /expanded && "bg-muted\/20"/);
  assert.doesNotMatch(source, /className="max-h-52 overflow-y-auto rounded-xl border bg-background\/80 p-3 shadow-sm"/);
  assert.doesNotMatch(source, /className="flex items-center justify-between gap-4 rounded-xl border bg-muted\/20 px-4 py-3"/);
  assert.doesNotMatch(source, /className="space-y-3 rounded-xl border p-3"/);
});

test("geojson selected feature cleanup tolerates missing map sources during reload", async () => {
  const source = await loadDashboardSource();
  const cleanupSource = source.slice(
    source.indexOf("return () => {\n      const currentFeatureId = selectedFeatureIdRef.current;"),
    source.indexOf("  }, [isLoaded, layer, map, selectedFeature]);"),
  );

  assert.match(cleanupSource, /try \{\s*if \(currentFeatureId == null \|\| !map\?\.getSource\(sourceId\)\) return;/);
  assert.doesNotMatch(
    cleanupSource,
    /if \(currentFeatureId == null \|\| !map\.getSource\(sourceId\)\) return;\s*\n\s*try \{/,
  );
});

test("map style changes do not force a full map remount that drops active layers", async () => {
  const source = await loadDashboardSource();

  assert.doesNotMatch(source, /key=\{`\$\{theme\}-\$\{basemap\}`\}/);
  assert.doesNotMatch(source, /key=\{`analysis-dashboard-\$\{theme\}`\}/);
});
