import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const sidebarSourcePath = new URL("../src/components/app-sidebar.tsx", import.meta.url);
const logoAssetPath = new URL("../public/images/limen.svg", import.meta.url);

test("sidebar brand renders the LIMEN logo instead of placeholder text", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");

  assert.match(source, /src="\/images\/limen\.svg"/);
  assert.doesNotMatch(source, /\{\{name\}\}/);
  await access(logoAssetPath);
});

test("sidebar toggle aligns with the logo center without a framed button treatment", async () => {
  const source = await readFile(sidebarSourcePath, "utf8");

  assert.match(source, /items-center justify-between/);
  assert.match(source, /group-data-\[collapsible=icon\]:justify-center/);
  assert.match(source, /relative z-30/);
  assert.match(source, /active:not-aria-\[haspopup\]:translate-y-0/);
  assert.doesNotMatch(source, /top-1\/2/);
  assert.doesNotMatch(source, /-translate-y-1\/2/);
  assert.doesNotMatch(source, /group-data-\[collapsible=icon\]:right-1\/2/);
  assert.doesNotMatch(source, /group-data-\[collapsible=icon\]:translate-x-1\/2/);
  assert.doesNotMatch(source, /border border-sidebar-border/);
  assert.doesNotMatch(source, /bg-sidebar shadow-sm/);
});
