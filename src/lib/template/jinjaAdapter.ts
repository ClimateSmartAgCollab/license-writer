import type { JinjaTemplateAdapter, InsertVariableInput } from "@/types/templateAdapterInterfaces";
import type {
  TemplateDocument,
  TemplateIfBlockNode,
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
      if (node.kind === "if_block") {
        const branchText = node.branches
          .map((branch) => `${branch.rawOpen}${printNodes(branch.body)}`)
          .join("");
        return `${branchText}${node.rawClose}`;
      }
      return `${node.rawOpen}${printNodes(node.body)}${node.rawClose}`;
    })
    .join("");

const print = (doc: TemplateDocument): string => printNodes(doc.nodes);

const parse = (text: string): TemplateDocument => {
  const tokenRegex = /({{[\s\S]*?}}|{%[\s\S]*?%})/g;
  const root: TemplateNode[] = [];
  type BlockFrame =
    | {
        type: "for";
        node: TemplateForBlockNode;
      }
    | {
        type: "if";
        node: TemplateIfBlockNode;
        activeBranch: number;
      };
  const stack: BlockFrame[] = [];

  const appendNode = (node: TemplateNode, targetFrame?: BlockFrame) => {
    const frame = targetFrame ?? stack[stack.length - 1];
    if (!frame) {
      root.push(node);
      return;
    }

    if (frame.type === "for") {
      frame.node.body.push(node);
      return;
    }

    frame.node.branches[frame.activeBranch].body.push(node);
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
          type: "for",
          node: {
            kind: "for_block",
            loopVar: forMatch[1],
            iterable: forMatch[2].trim(),
            body: [],
            rawOpen: token,
            rawClose: "{% endfor %}",
          },
        });
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "endfor") {
      const block = stack.pop();
      if (!block || block.type !== "for") {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Unmatched endfor tag.",
        });
      } else {
        block.node.rawClose = token;
        appendNode(block.node);
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "if") {
      const condition = blockContent.replace(/^if\s+/, "").trim();
      if (!condition) {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Malformed if tag.",
        });
      } else {
        stack.push({
          type: "if",
          activeBranch: 0,
          node: {
            kind: "if_block",
            branches: [{ condition, body: [], rawOpen: token }],
            rawClose: "{% endif %}",
          },
        });
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "elif") {
      const frame = stack[stack.length - 1];
      if (!frame || frame.type !== "if") {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Unmatched elif tag.",
        });
      } else if (frame.node.branches.some((branch) => branch.condition === null)) {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Elif after else in if block.",
        });
      } else {
        const condition = blockContent.replace(/^elif\s+/, "").trim();
        if (!condition) {
          appendNode({
            kind: "unsupported",
            raw: token,
            reason: "Malformed elif tag.",
          });
        } else {
          frame.node.branches.push({ condition, body: [], rawOpen: token });
          frame.activeBranch = frame.node.branches.length - 1;
        }
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "else") {
      const frame = stack[stack.length - 1];
      if (!frame || frame.type !== "if") {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Unmatched else tag.",
        });
      } else if (frame.node.branches.some((branch) => branch.condition === null)) {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Duplicate else tag in if block.",
        });
      } else {
        frame.node.branches.push({ condition: null, body: [], rawOpen: token });
        frame.activeBranch = frame.node.branches.length - 1;
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    if (tag === "endif") {
      const block = stack.pop();
      if (!block || block.type !== "if") {
        appendNode({
          kind: "unsupported",
          raw: token,
          reason: "Unmatched endif tag.",
        });
      } else {
        block.node.rawClose = token;
        appendNode(block.node);
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
    if (unfinished.type === "for") {
      appendNode({
        kind: "unsupported",
        raw: `${unfinished.node.rawOpen}${printNodes(unfinished.node.body)}`,
        reason: "Unclosed for block.",
      });
    } else {
      const partialText = unfinished.node.branches
        .map((branch) => `${branch.rawOpen}${printNodes(branch.body)}`)
        .join("");
      appendNode({
        kind: "unsupported",
        raw: partialText,
        reason: "Unclosed if block.",
      });
    }
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
      } else if (node.kind === "if_block") {
        for (const branch of node.branches) {
          walk(branch.body);
        }
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
