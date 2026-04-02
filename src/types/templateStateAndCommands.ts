import type { TemplateDocument, TemplateWarning } from "@/types/template-ast";

export type TemplateMode = "builder" | "advanced";

export interface BuilderRepeatContext {
  parentName: string;
  nestedAttributes: string[];
}

export interface InsertVariableCommand {
  type: "insert_variable";
  payload: {
    mode: TemplateMode;
    cursorOffset: number;
    attrName: string;
    isNested?: boolean;
    parentName?: string;
    basePlainText?: string;
    /** Per UI gesture; duplicate dispatches with the same nonce are ignored (fixes double-apply → wrong length / destructive sync). */
    insertNonce?: string;
  };
}

export interface InsertForBlockCommand {
  type: "insert_for_block";
  payload: {
    cursorOffset: number;
    parentName: string;
    nestedAttributes: string[];
    basePlainText?: string;
    insertNonce?: string;
  };
}

export interface SetBuilderContextCommand {
  type: "set_builder_context";
  payload: {
    context: BuilderRepeatContext | null;
  };
}

export interface SetFromAdvancedTextCommand {
  type: "set_from_advanced_text";
  payload: {
    text: string;
  };
}

export interface SetFromBuilderTextCommand {
  type: "set_from_builder_text";
  payload: {
    text: string;
  };
}

/** Clears template state to empty; used when switching from template-only to OCA workflow. */
export interface ResetTemplateCommand {
  type: "reset_template";
}

export type TemplateCommand =
  | InsertVariableCommand
  | InsertForBlockCommand
  | SetBuilderContextCommand
  | SetFromAdvancedTextCommand
  | SetFromBuilderTextCommand
  | ResetTemplateCommand;

export interface TemplateState {
  document: TemplateDocument;
  jinjaText: string;
  builderText: string;
  warnings: TemplateWarning[];
  isBuilderLimited: boolean;
  builderWarning: TemplateWarning | null;
  builderContext: BuilderRepeatContext | null;
}
