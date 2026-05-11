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
