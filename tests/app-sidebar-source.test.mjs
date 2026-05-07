import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebarSourcePath = new URL("../src/components/app-sidebar.tsx", import.meta.url);
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
