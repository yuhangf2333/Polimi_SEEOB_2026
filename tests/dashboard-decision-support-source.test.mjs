import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const sidebarSourcePath = new URL("../src/components/app-sidebar.tsx", import.meta.url);
const viewerSourcePath = new URL("../src/components/milan-layer-viewer.tsx", import.meta.url);
const dashboard2PagePath = new URL("../src/app/dashboard2/page.tsx", import.meta.url);

async function readSource(path) {
  return readFile(path, "utf8");
}

function extractPanelSource(source) {
  const start = source.indexOf("function AnalysisDecisionSupportPanel");
  const end = source.indexOf("function AnalysisTypologyDonut", start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  return source.slice(start, end);
}

test("analysis sidebar no longer exposes Dashboard 2", async () => {
  const source = await readSource(sidebarSourcePath);

  assert.doesNotMatch(source, /title: "Dashboard 2"/);
  assert.doesNotMatch(source, /analysis-dashboard2/);
});

test("default analysis dashboard uses the decision support panel without a dashboard2 variant", async () => {
  const source = await readSource(viewerSourcePath);

  assert.match(source, /<AnalysisDecisionSupportPanel/);
  assert.doesNotMatch(source, /analysis-dashboard2/);
  assert.doesNotMatch(source, /variant=\{isAnalysisDashboard2/);
});

test("decision support panel removes annotated helper labels and compresses copy", async () => {
  const source = await readSource(viewerSourcePath);
  const panelSource = extractPanelSource(source);

  assert.doesNotMatch(panelSource, /Funding-aware prioritisation view/);
  assert.doesNotMatch(panelSource, /Typology mix/);
  assert.doesNotMatch(panelSource, /reportScoreBand\(priorityScore\)/);
  assert.doesNotMatch(panelSource, /packages/);
  assert.doesNotMatch(panelSource, /row\.note/);
  assert.doesNotMatch(panelSource, /item\.detail/);
  assert.doesNotMatch(panelSource, /first-pass prioritisation before field validation/);
});

test("decision support keeps original recommendation copy and bottom export", async () => {
  const source = await readSource(viewerSourcePath);
  const panelSource = extractPanelSource(source);

  assert.doesNotMatch(panelSource, />\s*lead\s*</);
  assert.doesNotMatch(panelSource, /Funding readiness/);
  assert.match(panelSource, /Recommendation/);
  assert.match(panelSource, /recommendationItems\.map/);
  assert.match(panelSource, /Export report/);
  assert.match(source, /function buildHumanRecommendationItems/);
  assert.match(source, /function humanDriverSentence/);
  assert.match(source, /Treat this as a first-pass priority area/);
  assert.match(source, /Review frequency, interchange quality and first\/last-mile access/);
  assert.doesNotMatch(source, /function buildCompactRecommendationItems/);
});

test("decision support text wraps and uses the full sidebar height", async () => {
  const source = await readSource(viewerSourcePath);
  const panelSource = extractPanelSource(source);

  assert.doesNotMatch(panelSource, /truncate font-medium/);
  assert.doesNotMatch(panelSource, /truncate text-sm/);
  assert.match(panelSource, /min-h-full/);
  assert.match(panelSource, /break-words/);
});

test("intervention families show all four planning action types", async () => {
  const source = await readSource(viewerSourcePath);
  const start = source.indexOf("function buildAnalysisInterventionFamilies");
  const end = source.indexOf("function buildHumanRecommendationItems", start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const familySource = source.slice(start, end);

  assert.match(familySource, /Improve PT frequency & first\/last mile/);
  assert.match(familySource, /Expand essential services access/);
  assert.match(familySource, /Equity safeguards and local validation/);
  assert.match(familySource, /Spatial design feasibility/);
  assert.doesNotMatch(familySource, /\.slice\(0,\s*3\)/);
});

test("dashboard2 is not implemented as a standalone route", async () => {
  await assert.rejects(() => stat(dashboard2PagePath), {
    code: "ENOENT",
  });
});
