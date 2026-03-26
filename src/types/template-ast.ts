export type TemplateNodeKind = "text" | "variable" | "for_block";

export interface TemplateNode {
  kind: TemplateNodeKind;
  raw: string;
}

export interface TemplateAstDocument {
  rawText: string;
  nodes: TemplateNode[];
}

export interface TemplateWarning {
  code: "unsupported_construct";
  message: string;
  detail?: string;
}
