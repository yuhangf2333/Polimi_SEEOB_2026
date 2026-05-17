import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packagePath = new URL("../package.json", import.meta.url);

test("production start script uses the standalone Next server", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

  assert.equal(packageJson.scripts.start, "node .next/standalone/server.js");
  assert.notEqual(packageJson.scripts.start, "next start");
});
