export const LICENSE_TEMPLATE_RECORD_TYPE = "license_template_record";
export const LICENSE_TEMPLATE_RECORD_VERSION = 1;
export const LICENSE_TEMPLATE_SAID_LABEL = "d" as const;

export type LicenseTemplateSaidLabel = typeof LICENSE_TEMPLATE_SAID_LABEL;

export interface LicenseTemplateRecordInput {
  /** Canonical Jinja source. */
  jinja: string;
  /** OCA package top-level `d` when present; null on template-only flow. */
  ocaPackageD: string | null;
  attributeNames: string[];
}

export interface LicenseTemplateRecord {
  d: string;
  record_type: typeof LICENSE_TEMPLATE_RECORD_TYPE;
  record_version: typeof LICENSE_TEMPLATE_RECORD_VERSION;
  jinja: string;
  oca_package_d: string | null;
  attribute_names: string[];
}
