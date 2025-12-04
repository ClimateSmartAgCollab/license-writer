export type AttributeType =
  | 'Text'
  | 'Array[Text]'
  | 'Numeric'
  | 'Array[Numeric]'
  | 'DateTime'
  | 'Array[DateTime]'
  | 'Boolean'
  | 'Array[Boolean]'
  | 'Binary'
  | 'Array[Binary]'
  | 'Date' 
  | 'Reference';


export interface BaseOverlay {
  d: string; 
  capture_base: string;
  type: string;
  language?: string;
}

export interface CaptureBase {
  d: string; 
  type: string; 
  attributes: Record<string, AttributeType>;
  classification: string;
  flagged_attributes: string[];
}

export interface EntryOverlay extends BaseOverlay {
  type: 'spec/overlays/entry/1.1';
  language: string;
  attribute_entries: Record<string, Record<string, string>>; 
}

export interface EntryCodeOverlay extends BaseOverlay {
  type: 'spec/overlays/entry_code/1.1';
  attribute_entry_codes: Record<string, string[]>; 
}

export interface FormatOverlay extends BaseOverlay {
  type: 'spec/overlays/format/1.1';
  attribute_formats: Record<string, string>; 
} 

export interface LabelOverlay extends BaseOverlay {
  type: 'spec/overlays/label/1.1';
  language: string;
  attribute_categories: string[];
  attribute_labels: Record<string, string>; 
  category_labels: Record<string, string>;
}

export interface MetaOverlay extends BaseOverlay {
  type: 'spec/overlays/meta/1.1';
  language: string;
  description: string;
  name: string;
}

export interface BundleOverlays {
  entry?: EntryOverlay[];
  entry_code?: EntryCodeOverlay;
  format?: FormatOverlay;
  label?: LabelOverlay[];
  meta?: MetaOverlay[];
}

export interface Bundle {
  v: string; 
  d: string; 
  capture_base: CaptureBase;
  overlays: BundleOverlays;
}

export interface OCABundle {
  v: string; 
  bundle: Bundle;
  dependencies: string[];
}

export interface AttributeOrderItem {
  attribute_order: string[];
  named_section?: string;
}

export interface Page {
  attribute_order: AttributeOrderItem[];
  named_section: string;
}

export interface InteractionArguments {
  [attributeName: string]: {
    type: AttributeType;
    placeholder?: string;
    options?: string[];
  };
}

export interface InteractionOverlay {
  arguments: InteractionArguments;
}

export interface FormOverlay extends BaseOverlay {
  type: 'community/overlays/adc/form/1.1';
  language: string;
  pages: Page[];
  page_order: string[];
  page_labels: Record<string, string>; 
  sidebar_label?: Record<string, string>; 
  description: Record<string, string>; 
  title: string;
  interaction: InteractionOverlay[];
}

export interface OrderingOverlay extends BaseOverlay {
  type: 'community/overlays/adc/ordering/1.1';
  attribute_ordering: string[];
  entry_code_ordering?: Record<string, string[]>; 
}

export interface ADCExtensionOverlays {
  form?: FormOverlay[];
  ordering?: OrderingOverlay;
}

export interface ADCExtension {
  d: string; 
  type: 'community/adc/extension/1.0';
  overlays: ADCExtensionOverlays;
}

export interface Extensions {
  adc?: Record<string, ADCExtension>; 
  [key: string]: unknown; 
}

export interface OCAPackage {
  d: string; 
  type: string; 
  oca_bundle: OCABundle;
  extensions?: Extensions;
}




