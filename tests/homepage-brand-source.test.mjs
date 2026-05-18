import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homepageSourcePath = new URL("../src/components/milan/MilanHomepage.tsx", import.meta.url);
const homepageCssPath = new URL("../src/app/homepage.css", import.meta.url);
const layoutSourcePath = new URL("../src/app/layout.tsx", import.meta.url);
const dayLogoPath = new URL("../public/images/day_limen.svg", import.meta.url);
const nightLogoPath = new URL("../public/images/night_limen.svg", import.meta.url);

test("homepage feature cards use uploaded EO and priority ranking captures", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");

  assert.match(homepageSource, /milan-eo-territorial-context\.png/);
  assert.match(homepageSource, /width=\{2559\}/);
  assert.match(homepageSource, /height=\{1397\}/);
  assert.match(homepageSource, /milan-priority-ranking\.png/);
  assert.match(homepageSource, /width=\{2170\}/);
  assert.match(homepageSource, /height=\{1395\}/);
  assert.doesNotMatch(homepageSource, /fresh-eo-night-lights\.png/);
  assert.doesNotMatch(homepageSource, /milan-priority-card/);
  assert.doesNotMatch(homepageSource, /Priority is not severity/);
});

test("homepage assistant heading rotates between diagnosis and transport poverty intelligence copy", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");
  const homepageCss = await readFile(homepageCssPath, "utf8");

  assert.match(homepageSource, /import \{ useEffect, useState \} from "react"/);
  assert.match(homepageSource, /const assistantHeadlines = \[/);
  assert.match(homepageSource, /Diagnose the hotspot\. Explain the drivers\. Rank the priority\./);
  assert.match(homepageSource, /Intelligence for Transport Poverty Analysis/);
  assert.match(homepageSource, /window\.setInterval\([\s\S]*3000[\s\S]*\)/);
  assert.match(homepageSource, /milan-rotating-heading/);
  assert.match(homepageCss, /\.milan-rotating-heading__text/);
  assert.match(homepageCss, /@keyframes milanHeadlineSwap/);
  assert.match(homepageCss, /prefers-reduced-motion:\s*reduce/);
});

test("homepage replaces visible name placeholders with the LIMEN svg logo", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");
  const layoutSource = await readFile(layoutSourcePath, "utf8");

  assert.doesNotMatch(homepageSource, /\{\{name\}\}/);
  assert.doesNotMatch(layoutSource, /\{\{name\}\}/);
  assert.match(homepageSource, /function LimenLogo/);
  assert.match(homepageSource, /<LimenLogo className="atlas-logo__image" \/>/);
  assert.match(homepageSource, /<LimenLogo className="atlas-logo-heading__image" preload \/>/);
  assert.match(homepageSource, /<LimenLogo className="atlas-footer-logo__image" \/>/);
});

test("homepage dark-surface logos use the redesigned night SVG asset", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");
  const homepageCss = await readFile(homepageCssPath, "utf8");
  const dayLogo = await readFile(dayLogoPath, "utf8");
  const nightLogo = await readFile(nightLogoPath, "utf8");

  assert.match(homepageSource, /src="\/images\/night_limen\.svg"/);
  assert.doesNotMatch(homepageSource, /srcSet="\/images\/night_limen\.svg"/);
  assert.doesNotMatch(homepageSource, /src="\/images\/day_limen\.svg"/);
  assert.match(dayLogo, /fill="#000000"/);
  assert.match(nightLogo, /fill="#FFFFFF"/);
  assert.match(dayLogo, /fill="#35C68A"/);
  assert.match(nightLogo, /fill="#35C68A"/);
  assert.doesNotMatch(homepageCss, /filter:\s*brightness\(0\)\s*invert\(1\)/);
});

test("homepage removes decorative marks and footer launch arrow", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");
  const footerStart = homepageSource.indexOf('<footer className="atlas-footer">');
  const footerSource = homepageSource.slice(
    footerStart,
    homepageSource.indexOf("</footer>", footerStart),
  );

  assert.notEqual(footerStart, -1);
  assert.doesNotMatch(homepageSource, /atlas-ai-pill/);
  assert.doesNotMatch(homepageSource, /Read the logic/);
  assert.doesNotMatch(footerSource, /atlas-mark atlas-mark--milan/);
  assert.doesNotMatch(footerSource, /Launch viewer <span>/);
  assert.doesNotMatch(footerSource, /TP-IPT WebGIS decision-support homepage demo/);
  assert.doesNotMatch(footerSource, /BRIEFING LOGIC/);
  assert.doesNotMatch(footerSource, /Scenario weighting/);
  assert.doesNotMatch(footerSource, /Hotspot typology/);
  assert.doesNotMatch(footerSource, /Report export/);
  assert.doesNotMatch(footerSource, /Local validation/);
  assert.match(footerSource, /2026 SEEOB GROUP3 PROJECT/);
});

test("homepage hero map image loads eagerly for LCP without deprecated priority behavior", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");
  const heroMapImageSource = homepageSource.slice(
    homepageSource.indexOf('className="atlas-map-shell__map"'),
    homepageSource.indexOf("</div>", homepageSource.indexOf('className="atlas-map-shell__map"')),
  );

  assert.match(heroMapImageSource, /loading="eager"/);
  assert.doesNotMatch(heroMapImageSource, /preload=\{activeIndex === 0\}/);
});

test("homepage does not request corrupted Inter webfont assets", async () => {
  const homepageCss = await readFile(homepageCssPath, "utf8");

  assert.doesNotMatch(homepageCss, /\/fonts\/Inter-(Regular|Medium|SemiBold)\.woff2/);
});

test("homepage removes the transparent computation workflow section", async () => {
  const homepageSource = await readFile(homepageSourcePath, "utf8");

  assert.doesNotMatch(homepageSource, /id="workflow"/);
  assert.doesNotMatch(homepageSource, /Designed around transparent computation/);
  assert.doesNotMatch(homepageSource, /Inspect live layers/);
  assert.doesNotMatch(homepageSource, /Transparent scores first/);
  assert.doesNotMatch(homepageSource, /Scenario-based decisions/);
  assert.doesNotMatch(homepageSource, /Designed for public actors/);
  assert.doesNotMatch(homepageSource, /atlas-workflow-canvas/);
  assert.doesNotMatch(homepageSource, /workflowPoints/);
  assert.doesNotMatch(homepageSource, /href="#workflow"/);
});
