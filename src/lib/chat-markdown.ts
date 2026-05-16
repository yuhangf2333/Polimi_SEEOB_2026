export type ChatMarkdownAlignment = "left" | "center" | "right";

export type ChatMarkdownBlock =
  | { type: "paragraph"; text: string; emphasis?: boolean }
  | { type: "list"; items: string[]; ordered: boolean }
  | {
      type: "table";
      headers: string[];
      alignments: ChatMarkdownAlignment[];
      rows: string[][];
    };

const TABLE_CELL_SEPARATOR = "|";
const TABLE_SEPARATOR_CELL = /^:?-{3,}:?$/;

export function parseChatMarkdown(content: string): ChatMarkdownBlock[] {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/(\S)\s+(\d+[.)])\s+/g, "$1\n$2 ")
    .replace(/(\S)\s+\*\s+/g, "$1\n* ");
  const lines = normalized.split("\n");
  const blocks: ChatMarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    const text = paragraph
      .join(" ")
      .replace(/^#{1,4}\s+/, "")
      .trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
        emphasis: /^(\*\*)?[\w\s/-]+:/.test(text),
      });
    }
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems, ordered: listOrdered });
    }
    listItems = [];
    listOrdered = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if (isTableRow(line) && isTableSeparatorRow(nextLine)) {
      flushParagraph();
      flushList();

      const headers = splitTableRow(line);
      const alignments = splitTableRow(nextLine).map(tableAlignment);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && isTableRow(lines[index].trim())) {
        rows.push(normalizeTableRow(splitTableRow(lines[index].trim()), headers.length));
        index += 1;
      }

      index -= 1;
      blocks.push({
        type: "table",
        headers,
        alignments: normalizeTableAlignments(alignments, headers.length),
        rows,
      });
      continue;
    }

    const listMatch = line.match(/^(\d+[.)]|[-*])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      flushParagraph();
      if (listItems.length && listOrdered !== ordered) flushList();
      listOrdered = ordered;
      listItems.push(listMatch[2].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: "paragraph", text: content }];
}

function isTableRow(line: string) {
  return line.includes(TABLE_CELL_SEPARATOR) && splitTableRow(line).length > 1;
}

function isTableSeparatorRow(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => TABLE_SEPARATOR_CELL.test(cell));
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(TABLE_CELL_SEPARATOR)
    .map((cell) => cell.trim());
}

function tableAlignment(cell: string): ChatMarkdownAlignment {
  const startsWithColon = cell.startsWith(":");
  const endsWithColon = cell.endsWith(":");

  if (startsWithColon && endsWithColon) return "center";
  if (endsWithColon) return "right";
  return "left";
}

function normalizeTableAlignments(
  alignments: ChatMarkdownAlignment[],
  columnCount: number,
) {
  return Array.from(
    { length: columnCount },
    (_, index) => alignments[index] ?? "left",
  );
}

function normalizeTableRow(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => cells[index] ?? "");
}
