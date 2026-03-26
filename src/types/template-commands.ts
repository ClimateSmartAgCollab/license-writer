import type { TemplateWarning } from "@/types/template-ast";

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
  };
}

export interface InsertForBlockCommand {
  type: "insert_for_block";
  payload: {
    cursorOffset: number;
    parentName: string;
    nestedAttributes: string[];
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

export type TemplateCommand =
  | InsertVariableCommand
  | InsertForBlockCommand
  | SetBuilderContextCommand
  | SetFromAdvancedTextCommand;

export interface TemplateState {
  jinjaText: string;
  warnings: TemplateWarning[];
  builderContext: BuilderRepeatContext | null;
}
