import type {
  BuilderProjection,
  BuilderTemplateAdapter,
  InsertVariableInput,
} from "@/types/templateAdapterInterfaces";
import type { BuilderRepeatContext } from "@/types/templateStateAndCommands";
import type { TemplateDocument, TemplateNode } from "@/types/template-ast";
import { jinjaAdapter } from "@/lib/template/jinjaAdapter";

// Builder can safely edit dotted paths where the root is an identifier and
// subsequent path segments may be numeric (e.g. q10.5).
const SAFE_BUILDER_PATH_REGEX = /^[A-Za-z_][\w]*(\.[A-Za-z0-9_]+)*$/;
const BUILDER_FOR_OPEN_REGEX = /\[Start group of attributes:\s*([^\]]+)\]/g;
const BUILDER_FOR_CLOSE_REGEX = /\[End group of attributes\]/g;
const BUILDER_VARIABLE_REGEX = /\[([^\]]+)\]/g;

const BuilderSyntax = {
  variable: (expr: string) => `[${expr}]`,
  itemField: (field: string) => `[item.${field}]`,
  forBlockOpen: (parentName: string) => `[Start group of attributes: ${parentName}]`,
  forBlockClose: () => "[End group of attributes]",
  forBlock: (parentName: string) =>
    [
      BuilderSyntax.forBlockOpen(parentName),
      `This section will repeat for every item in ${BuilderSyntax.variable(parentName)}.`,
      "Write here... insert sub-fields before ending the section.",
      BuilderSyntax.forBlockClose(),
    ].join("\n"),
} as const;

const insertAt = (text: string, insertText: string, cursorOffset: number): string => {
  const position = Math.max(0, Math.min(cursorOffset, text.length));
  return `${text.slice(0, position)}${insertText}${text.slice(position)}`;
};

const parse = (text: string): TemplateDocument => {
  const jinjaText = text
    .replace(BUILDER_FOR_OPEN_REGEX, (_full, parentName: string) => {
      return `{% for item in ${parentName.trim()} %}`;
    })
    .replace(BUILDER_FOR_CLOSE_REGEX, "{% endfor %}")
    .replace(BUILDER_VARIABLE_REGEX, (_full, expr: string) => `{{ ${expr.trim()} }}`);

  return jinjaAdapter.parse(jinjaText);
};

const printNodesForBuilder = (
  nodes: TemplateNode[],
  loopVarContext?: string,
): { text: string; isLimited: boolean } => {
  let isLimited = false;
  const chunks: string[] = [];

  for (const node of nodes) {
    if (node.kind === "text") {
      chunks.push(node.raw);
      continue;
    }

    if (node.kind === "unsupported") {
      isLimited = true;
      chunks.push(node.raw);
      continue;
    }

    if (node.kind === "variable") {
      const expression = node.expression.trim();
      if (!SAFE_BUILDER_PATH_REGEX.test(expression)) {
        isLimited = true;
        chunks.push(node.raw);
        continue;
      }

      if (loopVarContext && expression.startsWith(`${loopVarContext}.`)) {
        chunks.push(BuilderSyntax.itemField(expression.replace(`${loopVarContext}.`, "")));
      } else {
        chunks.push(BuilderSyntax.variable(expression));
      }
      continue;
    }

    if (node.kind === "for_block") {
      if (!SAFE_BUILDER_PATH_REGEX.test(node.iterable)) {
        isLimited = true;
        chunks.push(`${node.rawOpen}${jinjaAdapter.print({ nodes: node.body })}${node.rawClose}`);
        continue;
      }

      const bodyProjection = printNodesForBuilder(node.body, node.loopVar);
      if (bodyProjection.isLimited) {
        isLimited = true;
      }

      const bodyText = bodyProjection.text;
      const newlineAfterOpen = bodyText.startsWith("\n") ? "" : "\n";
      const newlineBeforeClose = bodyText.endsWith("\n") ? "" : "\n";
      const block = `${BuilderSyntax.forBlockOpen(node.iterable)}${newlineAfterOpen}${bodyText}${newlineBeforeClose}${BuilderSyntax.forBlockClose()}`;
      chunks.push(block);
      continue;
    }

    if (node.kind === "if_block") {
      isLimited = true;
      const rawConditional = node.branches
        .map((branch) => `${branch.rawOpen}${jinjaAdapter.print({ nodes: branch.body })}`)
        .join("");
      chunks.push(`${rawConditional}${node.rawClose}`);
    }
  }

  return { text: chunks.join(""), isLimited };
};

const print = (doc: TemplateDocument): BuilderProjection => {
  const projection = printNodesForBuilder(doc.nodes);
  if (!projection.isLimited) {
    return { isLimited: false, text: projection.text };
  }

  return {
    isLimited: true,
    text: jinjaAdapter.print(doc),
    warning: {
      code: "builder_limited",
      message: "Builder limited/read-only for this template.",
      detail: "This template includes constructs the Builder cannot safely edit.",
    },
  };
};

const insertAtCursor = (
  document: TemplateDocument,
  snippet: string,
  cursorOffset: number,
  basePlainText?: string,
): TemplateDocument => {
  const projected = print(document);
  const text = basePlainText ?? projected.text;
  return parse(insertAt(text, snippet, cursorOffset));
};

const resolveSnippet = (
  attrName: string,
  isNested: boolean,
  parentName: string | undefined,
  context: BuilderRepeatContext | null,
): string => {
  const fullAttrName = isNested && parentName ? `${parentName}.${attrName}` : attrName;

  if (!context?.parentName) {
    return BuilderSyntax.variable(fullAttrName);
  }

  const itemFieldName = fullAttrName.startsWith(`${context.parentName}.`)
    ? fullAttrName.replace(`${context.parentName}.`, "")
    : attrName;

  return BuilderSyntax.itemField(itemFieldName);
};

/** Plain text inserted for a variable in Builder (must match insertVariable / resolveSnippet). */
export function getBuilderVariableSnippet(
  attrName: string,
  isNested: boolean,
  parentName: string | undefined,
  context: BuilderRepeatContext | null,
): string {
  return resolveSnippet(attrName, isNested, parentName, context);
}

const buildForBlockSnippet = (parentName: string): string => {
  return BuilderSyntax.forBlock(parentName);
};

const insertVariable = (
  { document, attrName, isNested, parentName, cursorOffset, basePlainText }: InsertVariableInput,
  context: BuilderRepeatContext | null,
): TemplateDocument => {
  const snippet = resolveSnippet(attrName, Boolean(isNested), parentName, context);
  return insertAtCursor(document, snippet, cursorOffset, basePlainText);
};

const insertForBlock = (
  document: TemplateDocument,
  cursorOffset: number,
  parentName: string,
  basePlainText?: string,
): TemplateDocument => {
  const block = buildForBlockSnippet(parentName);
  return insertAtCursor(document, block, cursorOffset, basePlainText);
};

const getRepeatContextHint = (context: BuilderRepeatContext | null): string | null => {
  if (!context) return null;
  return `Repeats for each item in [${context.parentName}]`;
};

export const builderAdapter: BuilderTemplateAdapter = {
  parse,
  print,
  insertVariable,
  insertForBlock,
  getRepeatContextHint,
};
