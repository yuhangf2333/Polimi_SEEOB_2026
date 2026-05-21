import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("next dev avoids the Turbopack Tailwind root-resolution regression", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const nextConfigSource = await readFile("next.config.ts", "utf8");

  assert.equal(packageJson.scripts.dev, "next dev --webpack");
  assert.doesNotMatch(nextConfigSource, /turbopack:\s*\{/);
});

test("next dev allows loopback browser origins for webpack HMR", async () => {
  const nextConfigSource = await readFile("next.config.ts", "utf8");

  assert.match(nextConfigSource, /allowedDevOrigins\s*:/);
  assert.match(nextConfigSource, /["']127\.0\.0\.1["']/);
  assert.match(nextConfigSource, /["']localhost["']/);
});
