import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourcePath = new URL("../src/app/api/analysis/interpret/route.ts", import.meta.url);

async function loadInterpretRouteSource() {
  return readFile(sourcePath, "utf8");
}

test("analysis interpret requests reserve enough tokens and ask for renderable formulas", async () => {
  const source = await loadInterpretRouteSource();

  assert.match(source, /const LLM_REQUEST_TIMEOUT_MS = 75_000/);
  assert.match(source, /const DEFAULT_LLM_MAX_TOKENS = 2600/);
  assert.match(source, /max_tokens: maxTokens/);
  assert.match(source, /For formulas, use display math blocks/);
  assert.match(source, /\$\$\\nPTD = 1 - PTA\\n\$\$/);
});

test("analysis interpret exposes truncation instead of silently returning incomplete answers", async () => {
  const source = await loadInterpretRouteSource();

  assert.match(source, /finish_reason\?: string \| null/);
  assert.match(source, /withTruncationNotice/);
  assert.match(source, /choice\?\.finish_reason === "length"/);
  assert.match(source, /reached its token limit/);
});
