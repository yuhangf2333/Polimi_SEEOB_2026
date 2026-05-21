import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../src/app/layout.tsx", import.meta.url);
const dashboardErrorPath = new URL("../src/app/dashboard/error.tsx", import.meta.url);
const dashboardViewerPath = new URL("../src/components/milan-layer-viewer.tsx", import.meta.url);

test("root layout installs a stale Next asset recovery logger", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /next\/script/);
  assert.match(source, /limen-stale-build-recovery/);
  assert.match(source, /limen:last-dashboard-runtime-error/);
  assert.match(source, /ChunkLoadError/);
  assert.match(source, /\/_next\//);
  assert.match(source, /sessionStorage/);
  assert.match(source, /window\.location\.reload\(\)/);
});

test("dashboard error boundary records the client error before recovery", async () => {
  const source = await readFile(dashboardErrorPath, "utf8");

  assert.match(source, /"use client"/);
  assert.match(source, /limen:last-dashboard-runtime-error/);
  assert.match(source, /console\.error/);
  assert.match(source, /ChunkLoadError/);
  assert.match(source, /window\.location\.reload\(\)/);
  assert.match(source, /reset\(\)/);
});

test("dashboard clears stale runtime reload sentinels after a healthy mount", async () => {
  const source = await readFile(dashboardViewerPath, "utf8");

  assert.match(source, /limen:dashboard-runtime-reload/);
  assert.match(source, /limen:dashboard-error-reload/);
  assert.match(source, /sessionStorage\.removeItem/);
});
