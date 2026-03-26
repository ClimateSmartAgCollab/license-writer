import type { BuilderRepeatContext } from "@/types/template-commands";
import type { TemplateAstDocument, TemplateWarning } from "@/types/template-ast";

export interface InsertVariableInput {
  text: string;
  attrName: string;
  cursorOffset: number;
  isNested?: boolean;
  parentName?: string;
}

export interface JinjaTemplateAdapter {
  parse: (text: string) => TemplateAstDocument;
  print: (doc: TemplateAstDocument) => string;
  insertVariable: (input: InsertVariableInput) => string;
  findWarnings: (text: string) => TemplateWarning[];
}

export interface BuilderTemplateAdapter {
  insertVariable: (input: InsertVariableInput, context: BuilderRepeatContext | null) => string;
  insertForBlock: (
    text: string,
    cursorOffset: number,
    parentName: string,
  ) => string;
  getRepeatContextHint: (context: BuilderRepeatContext | null) => string | null;
}
