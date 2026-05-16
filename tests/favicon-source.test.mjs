import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const appIconPath = new URL("../src/app/icon.svg", import.meta.url);
const legacyFaviconPath = new URL("../src/app/favicon.ico", import.meta.url);

test("app exposes the custom SVG favicon through the Next app icon convention", async () => {
  const icon = await readFile(appIconPath, "utf8");

  assert.match(icon, /<svg\b/);
  assert.match(icon, /viewBox="0 0 100 100"/);
  assert.match(icon, /fill="#35C68A"/);
});

test("legacy ico favicon is removed so browsers use the SVG app icon", async () => {
  await assert.rejects(access(legacyFaviconPath), { code: "ENOENT" });
});
