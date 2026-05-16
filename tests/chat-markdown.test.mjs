import assert from "node:assert/strict";
import test from "node:test";

async function loadChatMarkdown() {
  try {
    return await import("../src/lib/chat-markdown.ts");
  } catch (error) {
    assert.fail(`chat markdown module should load: ${error.message}`);
  }
}

test("parseChatMarkdown preserves markdown tables as structured blocks", async () => {
  const { parseChatMarkdown } = await loadChatMarkdown();

  const blocks = parseChatMarkdown(`
Key evidence:

| Evidence | Current value | Interpretation |
|---|---:|---|
| Intervention priority | 82.4 | High priority |
| Data confidence | 87.3 | High, but proxy-based |

- Validate GTFS and NeTEx coverage.
`);

  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "table");
  assert.deepEqual(blocks[1].headers, [
    "Evidence",
    "Current value",
    "Interpretation",
  ]);
  assert.deepEqual(blocks[1].alignments, ["left", "right", "left"]);
  assert.deepEqual(blocks[1].rows[0], [
    "Intervention priority",
    "82.4",
    "High priority",
  ]);
  assert.equal(blocks[2].type, "list");
});

test("parseChatMarkdown keeps numbered lists distinct from unordered lists", async () => {
  const { parseChatMarkdown } = await loadChatMarkdown();

  const blocks = parseChatMarkdown(`
1. Check the dominant driver.
2. Validate local constraints.

- Keep caveats visible.
`);

  assert.equal(blocks[0].type, "list");
  assert.equal(blocks[0].ordered, true);
  assert.deepEqual(blocks[0].items, [
    "Check the dominant driver.",
    "Validate local constraints.",
  ]);
  assert.equal(blocks[1].type, "list");
  assert.equal(blocks[1].ordered, false);
});

test("parseChatMarkdown preserves display math blocks for formula answers", async () => {
  const { parseChatMarkdown } = await loadChatMarkdown();

  const blocks = parseChatMarkdown(`
Formula:

$$
PTD_{display} = 100(1 - PTA)
$$

Use this for the dashboard score.
`);

  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "math");
  assert.equal(blocks[1].text, "PTD_{display} = 100(1 - PTA)");
  assert.equal(blocks[2].type, "paragraph");
});
