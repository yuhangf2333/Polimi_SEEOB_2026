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
