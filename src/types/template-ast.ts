export type TemplateNodeKind = "text" | "variable" | "for_block" | "unsupported";

export interface TemplateTextNode {
  kind: "text";
  raw: string;
}

export interface TemplateVariableNode {
  kind: "variable";
  expression: string;
  raw: string;
}

export interface TemplateForBlockNode {
  kind: "for_block";
  loopVar: string;
  iterable: string;
  body: TemplateNode[];
  rawOpen: string;
  rawClose: string;
}

export interface TemplateUnsupportedNode {
  kind: "unsupported";
  raw: string;
  reason: string;
}

export type TemplateNode =
  | TemplateTextNode
  | TemplateVariableNode
  | TemplateForBlockNode
  | TemplateUnsupportedNode;

export interface TemplateDocument {
  nodes: TemplateNode[];
}

export interface TemplateWarning {
  code: "unsupported_construct" | "parse_error" | "builder_limited";
  message: string;
  detail?: string;
}
