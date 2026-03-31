import type { JinjaTemplateAdapter, InsertVariableInput } from "@/types/template-adapters";
import type {
  TemplateDocument,
  TemplateForBlockNode,
  TemplateNode,
  TemplateWarning,
} from "@/types/template-ast";

const SUPPORTED_BLOCK_TAGS = new Set(["for", "endfor", "if", "elif", "else", "endif"]);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const insertAt = (text: string, insertText: string, cursorOffset: number): string => {
  const position = Math.max(0, Math.min(cursorOffset, text.length));
  return `${text.slice(0, position)}${insertText}${text.slice(position)}`;
};

const printNodes = (nodes: TemplateNode[]): string =>
  nodes
    .map((node) => {
      if (node.kind === "text") return node.raw;
      if (node.kind === "unsupported") return node.raw;
      if (node.kind === "variable") return node.raw || `{{ ${node.expression} }}`;
      return `${node.rawOpen}${printNodes(node.body)}${node.rawClose}`;
    })
    .join("");

const print = (doc: TemplateDocument): string => printNodes(doc.nodes);

const parse = (text: string): TemplateDocument => {
  const tokenRegex = /({{[\s\S]*?}}|{%[\s\S]*?%})/g;
  const root: TemplateNode[] = [];
  const stack: TemplateForBlockNode[] = [];

  const appendNode = (node: TemplateNode) => {
    if (stack.length > 0) {
      stack[stack.length - 1].body.push(node);
      return;
    }
    root.push(node);
  };

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const [token] = match;
    const tokenStart = match.index;

    if (tokenStart > lastIndex) {
      appendNode({
        kind: "text",
        raw: text.slice(lastIndex, tokenStart),
      });
    }

    if (token.startsWith("{{")) {
      const expression = token.slice(2, -2).trim();
      appendNode({
        kind: "variable",
        expression,
        raw: token,
      });
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    const blockContent = token.slice(2, -2).trim();
    const tag = blockContent.split(/\s+/)[0]?.toLowerCase() ?? "";

    if (tag === "for") {
      const forMatch = blockContent.match(/^for\s+(\w+)\s+in\s+(.+)$/);
      if (!forMatch) {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Malformed for tag.",
        });
      } else {
        stack.push({
          kind: "for_block",
          loopVar: forMatch[1],
          iterable: forMatch[2].trim(),
          body: [],
          rawOpen: token,
          rawClose: "{% endfor %}",
        });
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "endfor") {
      const block = stack.pop();
      if (!block) {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Unmatched endfor tag.",
        });
      } else {
        block.rawClose = token;
        appendNode(block);
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (SUPPORTED_BLOCK_TAGS.has(tag)) {
      appendNode({
        kind: "unsupported",
        raw: token,
        reason: `Supported tag ${tag} has no editable AST node yet.`,
      });
    } else {
      appendNode({
        kind: "unsupported",
        raw: token,
        reason: `Unsupported Jinja tag: ${tag}.`,
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    appendNode({
      kind: "text",
      raw: text.slice(lastIndex),
    });
  }

  while (stack.length > 0) {
    const unfinished = stack.pop()!;
    appendNode({
      kind: "unsupported",
      raw: `${unfinished.rawOpen}${printNodes(unfinished.body)}`,
      reason: "Unclosed for block.",
    });
  }

  return { nodes: root };
};

const findWarnings = (doc: TemplateDocument): TemplateWarning[] => {
  const warnings: TemplateWarning[] = [];
  const unsupportedReasons = new Set<string>();

  const walk = (nodes: TemplateNode[]) => {
    for (const node of nodes) {
      if (node.kind === "unsupported") {
        unsupportedReasons.add(node.reason);
      } else if (node.kind === "for_block") {
        walk(node.body);
      }
    }
  };

  walk(doc.nodes);

  for (const reason of unsupportedReasons) {
    warnings.push({
      code: "unsupported_construct",
      message: "Template contains unsupported construct.",
      detail: reason,
    });
  }

  return warnings;
};

const insertNestedVariable = ({
  document,
  attrName,
  parentName,
  cursorOffset,
  baseText,
}: Required<Pick<InsertVariableInput, "document" | "attrName" | "parentName" | "cursorOffset">> & {
  baseText?: string;
}): TemplateDocument => {
  const text = baseText ?? print(document);
  const escParent = escapeRegExp(parentName);
  const escAttr = escapeRegExp(attrName);
  const loopRegex = new RegExp(
    `{%\\s*for\\s+\\w+\\s+in\\s+${escParent}\\s*%}([\\s\\S]*?){%\\s*endfor\\s*%}`,
    "g",
  );

  let match: RegExpExecArray | null;
  while ((match = loopRegex.exec(text)) !== null) {
    const loopStart = match.index;
    const loopEnd = loopStart + match[0].length;
    const openingTag = match[0].match(/{%\s*for\s+[^%]+%}/)?.[0] || "";
    const closingTag = match[0].match(/{%\s*endfor\s*%}/)?.[0] || "";
    const contentStart = loopStart + openingTag.length;
    const contentEnd = loopEnd - closingTag.length;
    const tolerance = 10;

    if (
      cursorOffset >= contentStart - tolerance &&
      cursorOffset <= contentEnd + tolerance
    ) {
      const loopVar = openingTag.match(/{%\s*for\s+(\w+)\s+in/)?.[1] || "item";
      const attrPattern = new RegExp(`{{\\s*${loopVar}\\.${escAttr}\\s*}}`, "i");

      if (attrPattern.test(match[1])) {
        return document;
      }

      return parse(insertAt(text, `{{ ${loopVar}.${attrName} }}`, cursorOffset));
    }
  }

  const block = `{% for item in ${parentName} %}\n  {{ item.${attrName} }}\n{% endfor %}`;
  return parse(insertAt(text, block, cursorOffset));
};

const insertVariable = ({
  document,
  attrName,
  cursorOffset,
  isNested,
  parentName,
  basePlainText,
}: InsertVariableInput): TemplateDocument => {
  const base = basePlainText ?? print(document);
  if (isNested && parentName) {
    return insertNestedVariable({
      document,
      attrName,
      parentName,
      cursorOffset,
      baseText: base,
    });
  }

  return parse(insertAt(base, `{{ ${attrName} }}`, cursorOffset));
};

export const jinjaAdapter: JinjaTemplateAdapter = {
  parse,
  print,
  insertVariable,
  findWarnings,
};
