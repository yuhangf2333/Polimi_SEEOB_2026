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

test("analysis model pill opens a real dropdown menu", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /DropdownMenuTrigger/);
  assert.match(source, /Active model/);
  assert.match(source, /Configured in Settings/);
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
});

test("analysis prose renders as readable body copy instead of bolding whole label paragraphs", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /function renderParagraphMarkdown/);
  assert.match(source, /text-\[13px\] leading-6 font-normal/);
  assert.match(source, /const labelMatch =/);
  assert.match(source, /renderParagraphMarkdown\(block\.text, muted\)/);
  assert.doesNotMatch(source, /block\.emphasis \? "font-medium text-foreground" : "text-foreground\/90"/);
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

test("dashboard stacks panels and removes fixed-width score rows on mobile", async () => {
  const source = await loadDashboardSource();

  assert.match(source, /overflow-y-auto lg:overflow-hidden/);
  assert.match(source, /grid min-h-full w-full min-w-0 gap-1\.5/);
  assert.match(source, /grid-cols-1/);
  assert.match(source, /lg:grid-cols-\[minmax\(390px,0\.42fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_2\.5rem\] sm:grid-cols-\[minmax\(12rem,0\.72fr\)_minmax\(0,1fr\)_2\.5rem\]/);
  assert.match(source, /grid-cols-1 items-center gap-1 overflow-hidden sm:grid-cols-\[minmax\(148px,0\.9fr\)_minmax\(7\.25rem,1fr\)\]/);
  assert.doesNotMatch(source, /\? "grid-cols-\[16rem_minmax\(0,1fr\)_2\.5rem\]"/);
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
  assert.doesNotMatch(source, /details\.sourceValues\.map/);
  assert.doesNotMatch(source, /details\.notes\.map/);
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
