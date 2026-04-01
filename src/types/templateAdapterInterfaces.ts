import type { BuilderRepeatContext } from "@/types/templateStateAndCommands";
import type { TemplateDocument, TemplateWarning } from "@/types/template-ast";

export interface InsertVariableInput {
  document: TemplateDocument;
  attrName: string;
  cursorOffset: number;
  isNested?: boolean;
  parentName?: string;
  /** Editor plain text at click time; avoids stale store when React has not applied the latest onChange yet. */
  basePlainText?: string;
}

export interface JinjaTemplateAdapter {
  parse: (text: string) => TemplateDocument;
  print: (doc: TemplateDocument) => string;
  insertVariable: (input: InsertVariableInput) => TemplateDocument;
  findWarnings: (doc: TemplateDocument) => TemplateWarning[];
}

export type BuilderProjection =
  | { isLimited: false; text: string }
  | { isLimited: true; text: string; warning: TemplateWarning };

export interface BuilderTemplateAdapter {
  parse: (text: string) => TemplateDocument;
  print: (doc: TemplateDocument) => BuilderProjection;
  insertVariable: (
    input: InsertVariableInput,
    context: BuilderRepeatContext | null,
  ) => TemplateDocument;
  insertForBlock: (
    document: TemplateDocument,
    cursorOffset: number,
    parentName: string,
    basePlainText?: string,
  ) => TemplateDocument;
  getRepeatContextHint: (context: BuilderRepeatContext | null) => string | null;
}
