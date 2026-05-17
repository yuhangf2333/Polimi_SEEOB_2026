import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebarSourcePath = new URL("../src/components/app-sidebar.tsx", import.meta.url);
const navMainSourcePath = new URL("../src/components/nav-main.tsx", import.meta.url);
const llmSettingsSourcePath = new URL("../src/lib/llm-settings.ts", import.meta.url);
const dayLogoPath = new URL("../public/images/day_limen.svg", import.meta.url);
const nightLogoPath = new URL("../public/images/night_limen.svg", import.meta.url);

test("sidebar uses the redesigned day and night LIMEN logos", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");
  const dayLogo = await readFile(dayLogoPath, "utf8");
  const nightLogo = await readFile(nightLogoPath, "utf8");

  assert.match(
    source,
    /const logoSrc =\s*theme === "dark" \? "\/images\/night_limen\.svg" : "\/images\/day_limen\.svg"/,
  );
  assert.match(source, /src=\{logoSrc\}/);
  assert.match(dayLogo, /fill="#000000"/);
  assert.match(nightLogo, /fill="#FFFFFF"/);
  assert.match(dayLogo, /fill="#35C68A"/);
  assert.match(nightLogo, /fill="#35C68A"/);
});

test("sidebar logo loads eagerly because it is above the fold", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");
  const logoImageSource = source.slice(
    source.indexOf("<Image"),
    source.indexOf("<SidebarTrigger"),
  );

  assert.match(logoImageSource, /loading="eager"/);
});

test("sidebar theme toggle has an accessible name", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");
  const themeToggleSource = source.slice(
    source.indexOf('tooltip={theme === "dark" ? "Light mode" : "Dark mode"}'),
    source.indexOf("<Sheet>"),
  );

  assert.match(themeToggleSource, /<span className="sr-only">/);
  assert.match(themeToggleSource, /theme === "dark" \? "Light mode" : "Dark mode"/);
});

test("sidebar reuses the social and services score icons in monochrome style", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");

  assert.match(source, /UsersRoundIcon/);
  assert.match(source, /HandHeartIcon/);
  assert.match(source, /id: "vulnerability"[\s\S]*icon: <UsersRoundIcon \/>/);
  assert.match(source, /id: "services"[\s\S]*icon: <HandHeartIcon \/>/);
  assert.doesNotMatch(source, /ShieldIcon/);
  assert.doesNotMatch(source, /UserRoundCheckIcon/);
  assert.doesNotMatch(source, /style=\{\{ color:/);
});

test("sidebar settings use a left-side API provider editor with Xiaomi defaults", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");
  const llmSettingsSource = await readFile(llmSettingsSourcePath, "utf8");

  assert.match(source, /<SheetContent[\s\S]*side="left"/);
  assert.match(source, /API Providers/);
  assert.doesNotMatch(source, /Add provider/);
  assert.doesNotMatch(source, /How to configure/);
  assert.doesNotMatch(source, /PlusIcon/);
  assert.match(source, /ProviderCard/);
  assert.match(source, /ProviderEditor/);
  assert.match(source, /providerIconMap/);
  assert.match(source, /providerId === DEFAULT_LLM_SETTINGS\.provider/);
  assert.match(source, /data-readonly-default-provider/);
  assert.match(source, /isDefaultProvider[\s\S]*readOnly/);
  assert.match(source, /theme === "dark" \? "dark" : ""/);
  assert.match(source, /data-\[side=left\]:w-\[min\(100vw,54rem\)\]/);
  assert.match(source, /grid-cols-\[15rem_minmax\(0,1fr\)\]/);
  assert.match(
    source,
    /providerId === DEFAULT_LLM_SETTINGS\.provider\s*\?\s*\{\s*\.\.\.DEFAULT_LLM_SETTINGS,\s*enabled: true,\s*\}/,
  );
  assert.doesNotMatch(source, /<SheetContent side="right"/);
  assert.match(llmSettingsSource, /export type LlmProviderId =\s*\|\s*"xiaomi"\s*\|\s*"openai"\s*\|\s*"google"\s*\|\s*"openai-compatible"/);
  assert.doesNotMatch(llmSettingsSource, /"openrouter"/);
  assert.doesNotMatch(llmSettingsSource, /"deepseek"/);
  assert.match(llmSettingsSource, /label: "Default"/);
  assert.match(llmSettingsSource, /description: "Xiaomi Mimo/);
  assert.match(llmSettingsSource, /https:\/\/token-plan-cn\.xiaomimimo\.com\/v1/);
  assert.match(llmSettingsSource, /model: "mimo-v2-omni"/);
  assert.match(llmSettingsSource, /temperature: 0\.1/);
});

test("remote model picker does not mix fetched models with common presets", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");

  assert.match(source, /type ModelOptionsSource = "preset" \| "remote"/);
  assert.match(source, /const \[modelOptionsSource, setModelOptionsSource\]/);
  assert.match(source, /modelOptionsSource === "remote"/);
  assert.match(source, /setModelOptionsSource\(data\.models\?\.length \? "remote" : "preset"\)/);
  assert.doesNotMatch(
    source,
    /\[\s*llmSettings\.model,\s*\.\.\.modelOptions,\s*\.\.\.activeProviderPreset\.modelOptions,\s*\.\.\.COMMON_LLM_MODEL_OPTIONS,\s*\]/,
  );
});

test("left navigation only increases local menu font sizing", async () => {
  const source = await readFile(navMainSourcePath, "utf8");

  assert.match(source, /<SidebarGroupLabel className="text-sm">Platform<\/SidebarGroupLabel>/);
  assert.match(source, /className="text-\[15px\]"/);
  assert.match(source, /<SidebarMenuSubButton[\s\S]*className="[^"]*text-\[15px\][^"]*"/);
});

test("sidebar lists the requested full strict layer menu", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");

  assert.doesNotMatch(source, /title: "Base"/);
  assert.doesNotMatch(source, /Boundaries & Context/);

  const vulnerabilitySource = source.slice(
    source.indexOf('title: "Vulnerability"'),
    source.indexOf('title: "Public Accessibility"'),
  );
  const publicAccessibilitySource = source.slice(
    source.indexOf('title: "Public Accessibility"'),
    source.indexOf('title: "Essential Services"'),
  );
  const servicesSource = source.slice(
    source.indexOf('title: "Essential Services"'),
    source.indexOf('title: "Earth Observation"'),
  );
  const earthObservationSource = source.slice(
    source.indexOf('title: "Earth Observation"'),
  );

  const expectedVulnerability = [
    ["Elderly vulnerability", "vulnerability-elderly"],
    ["Employment vulnerability", "vulnerability-employment"],
    ["Education vulnerability", "vulnerability-education"],
    ["Citizenship vulnerability", "vulnerability-citizenship"],
    ["Income vulnerability", "vulnerability-income"],
    ["Motorisation", "vulnerability-motorisation"],
    ["Low car access", "vulnerability-low-car-access"],
    ["Car dependency stress", "vulnerability-car-dependency-stress"],
    ["Social vulnerability index", "vulnerability-index"],
  ];
  const expectedPublicAccessibility = [
    ["Public transport accessibility", "ptal-public-transport-accessibility"],
    ["Public transport deficit", "ptal-public-transport-deficit"],
    ["Service frequency", "ptal-service-frequency"],
    ["Line availability", "ptal-line-availability"],
    ["ptal", "ptal-ptal-100m-gtfs-netex"],
    ["ptol", "ptal-ptol-100m-gtfs-netex"],
    ["Stops all", "ptal-stops-all"],
  ];
  const expectedServices = [
    ["Essential services accessibility", "services-essential-services-accessibility"],
    ["Essential services deficit", "services-essential-service-deficit"],
    ["Health access", "services-health-access"],
    ["School access", "services-school-access"],
    ["Job access", "services-job-access"],
    ["Grocery access", "services-grocery-access"],
    ["Services points", "services-points-all"],
  ];
  const expectedEarthObservation = [
    ["EO territorial disadvantage", "earth-observation-territorial-disadvantage"],
    ["Population demand", "earth-observation-population-demand"],
    ["Built-up density", "earth-observation-built-up-density"],
    ["Artificial land cover", "earth-observation-artificial-land-cover"],
    ["Artificial land cover 100m", "earth-observation-artificial-land-cover-100m"],
    ["Nighttime lights", "earth-observation-nighttime-lights"],
    ["Nighttime lights 100m", "earth-observation-nighttime-lights-100m"],
    ["Road density", "earth-observation-road-density"],
    ["Intersection density", "earth-observation-intersection-density"],
    ["Road connectivity", "earth-observation-road-connectivity"],
    ["Green land", "earth-observation-green-land"],
    ["Urban growth", "earth-observation-urban-growth"],
  ];

  for (const [title, layerId] of expectedVulnerability) {
    assert.match(vulnerabilitySource, new RegExp(`title: "${title}"[\\s\\S]*layerId: "${layerId}"`));
  }
  for (const [title, layerId] of expectedPublicAccessibility) {
    assert.match(publicAccessibilitySource, new RegExp(`title: "${title.replace("/", "\\/")}"[\\s\\S]*layerId: "${layerId}"`));
  }
  for (const [title, layerId] of expectedServices) {
    assert.match(servicesSource, new RegExp(`title: "${title}"[\\s\\S]*layerId: "${layerId}"`));
  }
  for (const [title, layerId] of expectedEarthObservation) {
    assert.match(earthObservationSource, new RegExp(`title: "${title}"[\\s\\S]*layerId: "${layerId}"`));
  }

  assert.doesNotMatch(vulnerabilitySource, /Gender vulnerability|vulnerability-gender/);
  assert.doesNotMatch(
    publicAccessibilitySource,
    /old ptd|ptal-old-ptd|PTAL component|PTAL detailed 250m|PTOL component|PTOL detailed 250m|PTAL\/PTOL component/,
  );
  assert.doesNotMatch(servicesSource, /Essential service gap/);
  assert.doesNotMatch(earthObservationSource, /SDGSAT-1 night lights|Green\/open land-cover|Urban growth 2010-2020/);
});
