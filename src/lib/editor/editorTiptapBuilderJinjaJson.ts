import type { JSONContent } from "@tiptap/core";

/** Match builderAdapter.parse (builder plain → jinja plain) for one text run. */
const BUILDER_FOR_OPEN_REGEX = /\[Start group of attributes:\s*([^\]]+)\]/g;
const BUILDER_FOR_CLOSE_REGEX = /\[End group of attributes\]/g;
const BUILDER_VARIABLE_REGEX = /\[([^\]]+)\]/g;

export function builderPlainChunkToJinja(chunk: string): string {
  // If this chunk already contains Jinja delimiters, don't try to re-interpret it as Builder.
  if (chunk.includes("{{") || chunk.includes("{%")) {
    return chunk;
  }
  return chunk
    .replace(BUILDER_FOR_OPEN_REGEX, (_full, parentName: string) => `{% for item in ${parentName.trim()} %}`)
    .replace(BUILDER_FOR_CLOSE_REGEX, "{% endfor %}")
    .replace(BUILDER_VARIABLE_REGEX, (_full, expr: string) => `{{ ${expr.trim()} }}`);
}

function hasBalancedPairs(text: string, open: string, close: string): boolean {
  return (text.match(new RegExp(open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length ===
    (text.match(new RegExp(close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
}

/**
 * If a text run contains partial delimiters (common when a token is split across adjacent
 * text nodes), converting only this run can corrupt the token (e.g. "{{ q1 }[q1]}").
 * In those cases we preserve the run as-is for this switch.
 */
function hasPartialBuilderToken(chunk: string): boolean {
  const hasBracket = chunk.includes("[") || chunk.includes("]");
  return hasBracket && !hasBalancedPairs(chunk, "[", "]");
}

function hasPartialJinjaToken(chunk: string): boolean {
  const hasVar = chunk.includes("{{") || chunk.includes("}}");
  const hasBlock = chunk.includes("{%") || chunk.includes("%}");
  const varBalanced = hasBalancedPairs(chunk, "{{", "}}");
  const blockBalanced = hasBalancedPairs(chunk, "{%", "%}");
  return (hasVar && !varBalanced) || (hasBlock && !blockBalanced);
}

/** Approximate inverse of builder projection (jinja plain → builder plain) for one text run. */
export function jinjaPlainChunkToBuilder(chunk: string): string {
  // If this chunk already contains Builder-style brackets, skip mapping to avoid mixing styles.
  if (chunk.includes("[") || chunk.includes("]")) {
    return chunk;
  }
  if (hasPartialJinjaToken(chunk)) {
    return chunk;
  }
  return chunk
    .replace(/\{%\s*endfor\s*%\}/g, "[End group of attributes]")
    .replace(/\{%\s*for\s+\w+\s+in\s+([^\s%]+)\s*%\}/g, (_f, iterable: string) => {
      return `[Start group of attributes: ${iterable.trim()}]`;
    })
    .replace(/\{\{\s*([^}]+)\s*\}\}/g, (_f, expr: string) => `[${expr.trim()}]`);
}

/** Rewrite only `text` leaves so TipTap marks / block structure are preserved across Builder ↔ Advanced. */
export function mapTipTapJsonTextNodes(node: JSONContent, mapText: (s: string) => string): JSONContent {
  if (node.type === "text" && typeof node.text === "string") {
    const source = node.text;
    if (mapText === builderPlainChunkToJinja && hasPartialBuilderToken(source)) {
      return { ...node, text: source };
    }
    if (mapText === jinjaPlainChunkToBuilder && hasPartialJinjaToken(source)) {
      return { ...node, text: source };
    }
    return { ...node, text: mapText(source) };
  }
  if (node.content && node.content.length > 0) {
    return { ...node, content: node.content.map((c) => mapTipTapJsonTextNodes(c, mapText)) };
  }
  return { ...node };
}
