import type { JinjaTemplateAdapter, InsertVariableInput } from "@/types/template-adapters";
import type { TemplateAstDocument, TemplateWarning } from "@/types/template-ast";

const SUPPORTED_BLOCK_TAGS = new Set(["for", "endfor", "if", "elif", "else", "endif"]);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const insertAt = (text: string, insertText: string, cursorOffset: number): string => {
  const position = Math.max(0, Math.min(cursorOffset, text.length));
  return `${text.slice(0, position)}${insertText}${text.slice(position)}`;
};

const parse = (text: string): TemplateAstDocument => ({
  rawText: text,
  nodes: text ? [{ kind: "text", raw: text }] : [],
});

const print = (doc: TemplateAstDocument): string => doc.rawText;

const findWarnings = (text: string): TemplateWarning[] => {
  const blockTagRegex = /{%\s*([a-zA-Z_][\w]*)\b[^%]*%}/g;
  const unsupportedTags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = blockTagRegex.exec(text)) !== null) {
    const tag = match[1].toLowerCase();
    if (!SUPPORTED_BLOCK_TAGS.has(tag)) {
      unsupportedTags.add(tag);
    }
  }

  if (unsupportedTags.size === 0) {
    return [];
  }

  return [
    {
      code: "unsupported_construct",
      message: "Unsupported Jinja block tags detected.",
      detail: `Unsupported tags: ${[...unsupportedTags].join(", ")}`,
    },
  ];
};

const insertNestedVariable = ({
  text,
  attrName,
  parentName,
  cursorOffset,
}: Required<Pick<InsertVariableInput, "text" | "attrName" | "parentName" | "cursorOffset">>): string => {
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
        return text;
      }

      return insertAt(text, `{{ ${loopVar}.${attrName} }}`, cursorOffset);
    }
  }

  const block = `{% for item in ${parentName} %}\n  {{ item.${attrName} }}\n{% endfor %}`;
  return insertAt(text, block, cursorOffset);
};

const insertVariable = ({
  text,
  attrName,
  cursorOffset,
  isNested,
  parentName,
}: InsertVariableInput): string => {
  if (isNested && parentName) {
    return insertNestedVariable({
      text,
      attrName,
      parentName,
      cursorOffset,
    });
  }

  return insertAt(text, `{{ ${attrName} }}`, cursorOffset);
};

export const jinjaAdapter: JinjaTemplateAdapter = {
  parse,
  print,
  insertVariable,
  findWarnings,
};
