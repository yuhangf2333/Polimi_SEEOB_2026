import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeFormulaText,
  tokenizeFormulaText,
} from "../src/lib/formula-rendering.mjs";

test("normalizeFormulaText converts common TeX commands into readable symbols", () => {
  const rendered = normalizeFormulaText(
    String.raw`SVI = 0.20 \cdot \text{Elderly} + PTD_{display} + CA^2`,
  );

  assert.equal(rendered, "SVI = 0.20 × Elderly + PTD_display + CA^2");
});

test("tokenizeFormulaText exposes subscript and superscript tokens for rendering", () => {
  const tokens = tokenizeFormulaText(
    String.raw`PTD_{display} = 100 \times (1 - PTA)^2`,
  );

  assert.deepEqual(tokens, [
    { type: "text", text: "PTD" },
    { type: "sub", text: "display" },
    { type: "text", text: " = 100 × (1 - PTA)" },
    { type: "sup", text: "2" },
  ]);
});
