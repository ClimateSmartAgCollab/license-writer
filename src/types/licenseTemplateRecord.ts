export interface LicenseTemplateRecordBase {
  type: "license_template/1.0";
  jinja: string;
  oca_package_d: string | null;
  // attribute_names: string[];
}

/** Record shape BEFORE saidify(). `d` is the empty-string placeholder. */
export interface LicenseTemplateRecordInput extends LicenseTemplateRecordBase {
  d: "";
}

/** Record shape AFTER saidify(). `d` is a computed digest string. */
export interface LicenseTemplateRecord extends LicenseTemplateRecordBase {
  d: string;
}
