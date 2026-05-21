const COMMAND_GROUP_PATTERN =
  /\\(?:text|mathrm|mathbf|mathit|mathsf|operatorname)\{([^{}]*)\}/g;

const SYMBOL_REPLACEMENTS = [
  [/\\(?:cdot|times)\b/g, "×"],
  [/\\(?:leq|le)\b/g, "≤"],
  [/\\(?:geq|ge)\b/g, "≥"],
  [/\\neq\b/g, "≠"],
  [/\\approx\b/g, "≈"],
  [/\\pm\b/g, "±"],
  [/\\(?:min|max|mean|sum)\b/g, (match) => match.slice(1)],
  [/\\left\b|\\right\b/g, ""],
  [/\\,/g, " "],
  [/\\_/g, "_"],
];

export function normalizeFormulaText(value) {
  return tokenizeFormulaText(value)
    .map((token) => {
      if (token.type === "sub") return `_${token.text}`;
      if (token.type === "sup") return `^${token.text}`;
      return token.text;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeFormulaText(value) {
  const text = prepareFormulaText(value);
  const tokens = [];
  let buffer = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== "_" && char !== "^") {
      buffer += char;
      continue;
    }

    const script = readFormulaScript(text, index + 1, char);
    if (!script) {
      buffer += char;
      continue;
    }

    pushTextToken(tokens, buffer);
    buffer = "";
    tokens.push({
      type: char === "_" ? "sub" : "sup",
      text: cleanFormulaSegment(script.text),
    });
    index = script.endIndex - 1;
  }

  pushTextToken(tokens, buffer);
  return tokens;
}

function prepareFormulaText(value) {
  let text = String(value ?? "").trim();

  if (text.startsWith("$$") && text.endsWith("$$")) {
    text = text.slice(2, -2).trim();
  }

  for (let pass = 0; pass < 4; pass += 1) {
    const next = text.replace(COMMAND_GROUP_PATTERN, "$1");
    if (next === text) break;
    text = next;
  }

  text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1) / ($2)");

  for (const [pattern, replacement] of SYMBOL_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function readFormulaScript(text, startIndex, marker) {
  if (text[startIndex] === "{") {
    let depth = 0;
    for (let index = startIndex; index < text.length; index += 1) {
      if (text[index] === "{") depth += 1;
      if (text[index] === "}") depth -= 1;
      if (depth === 0) {
        return {
          text: text.slice(startIndex + 1, index),
          endIndex: index + 1,
        };
      }
    }
    return null;
  }

  if (marker === "^" && /[A-Za-z0-9+\-]/.test(text[startIndex] ?? "")) {
    let endIndex = startIndex + 1;
    while (/[A-Za-z0-9+\-]/.test(text[endIndex] ?? "")) endIndex += 1;
    return {
      text: text.slice(startIndex, endIndex),
      endIndex,
    };
  }

  return null;
}

function cleanFormulaSegment(value) {
  return prepareFormulaText(value)
    .replace(/^\{+|\}+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushTextToken(tokens, value) {
  const text = cleanFormulaTextToken(value);
  if (!text) return;

  const previous = tokens[tokens.length - 1];
  if (previous?.type === "text") {
    previous.text += text;
    return;
  }

  tokens.push({ type: "text", text });
}

function cleanFormulaTextToken(value) {
  return String(value ?? "")
    .replace(/\{([^{}]*)\}/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([,;)])/g, "$1")
    .replace(/([(])\s+/g, "$1");
}
