import { canonicalize } from "json-canonicalize";
import { saidify, verify } from "saidify";
import type { LicenseTemplateRecord, LicenseTemplateRecordInput } from "@/types/licenseTemplateRecord";
import {
  LICENSE_TEMPLATE_RECORD_TYPE,
  LICENSE_TEMPLATE_RECORD_VERSION,
  LICENSE_TEMPLATE_SAID_LABEL,
} from "@/types/licenseTemplateRecord";

export {
  LICENSE_TEMPLATE_RECORD_TYPE,
  LICENSE_TEMPLATE_RECORD_VERSION,
  LICENSE_TEMPLATE_SAID_LABEL,
} from "@/types/licenseTemplateRecord";

const SAID_LABEL = LICENSE_TEMPLATE_SAID_LABEL;

function normalizeJinja(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/**
 * Builds the object to pass into `saidify` (empty `d` placeholder).
 * `attribute_names` is sorted so the same logical set yields the same SAID regardless of source order.
 */
export function buildLicenseTemplateRecord(
  input: LicenseTemplateRecordInput,
): LicenseTemplateRecord {
  const uniqueNames = Array.from(new Set(input.attributeNames.filter((n) => n.length > 0)));
  uniqueNames.sort((a, b) => a.localeCompare(b));

  return {
    d: "",
    record_type: LICENSE_TEMPLATE_RECORD_TYPE,
    record_version: LICENSE_TEMPLATE_RECORD_VERSION,
    jinja: normalizeJinja(input.jinja),
    oca_package_d: input.ocaPackageD,
    attribute_names: uniqueNames,
  };
}

export function saidifyRecord(
  record: LicenseTemplateRecord,
  label: string,
): [string, LicenseTemplateRecord] {
  if (label !== SAID_LABEL) {
    throw new Error(`SAID label must be "${SAID_LABEL}", got: ${label}`);
  }
  if (!Object.prototype.hasOwnProperty.call(record, SAID_LABEL)) {
    throw new Error(`Record must include a "${SAID_LABEL}" key before saidify`);
  }
  if (record.d !== "") {
    throw new Error(`Record "${SAID_LABEL}" must be an empty string before saidify`);
  }

  const [said, sad] = saidify(record, label);
  return [said, sad as LicenseTemplateRecord];
}

export function verifyRecord(sad: LicenseTemplateRecord, label: string = SAID_LABEL): boolean {
  if (label !== SAID_LABEL) {
    return false;
  }
  const digest = sad.d;
  if (typeof digest !== "string" || digest.length === 0) {
    return false;
  }
  return verify(sad as unknown as Record<string, unknown>, digest, label);
}

export function toCanonicalJsonString(value: unknown): string {
  return canonicalize(value);
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  let url: string | null = null;
  try {
    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

function saidJsonFilename(said: string): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const short = said.slice(0, 8).replace(/[^A-Za-z0-9_-]/g, "");
  return `license-template-${dateStamp}-${short || "said"}.json`;
}

export interface SaidExportResult {
  said: string;
  sad: LicenseTemplateRecord;
  canonicalJson: string;
}


export function buildSaidifiedLicenseTemplateRecord(
  input: LicenseTemplateRecordInput,
): SaidExportResult {
  const record = buildLicenseTemplateRecord(input);
  const [said, sad] = saidifyRecord(record, SAID_LABEL);
  if (!verifyRecord(sad, SAID_LABEL)) {
    throw new Error("SAID verification failed after saidify; export aborted.");
  }
  return {
    said,
    sad,
    canonicalJson: toCanonicalJsonString(sad),
  };
}

export function downloadSaidifiedLicenseTemplateJson(input: LicenseTemplateRecordInput): SaidExportResult {
  const result = buildSaidifiedLicenseTemplateRecord(input);
  downloadTextFile(saidJsonFilename(result.said), result.canonicalJson, "application/json");
  return result;
}

export function saidJsonExportRemountKey(
  jinjaText: string,
  ocaPackageD: string | null,
  attributeNames: readonly string[],
): string {
  return `${ocaPackageD ?? ""}\x1e${attributeNames.join("\x1e")}\x1e${jinjaText}`;
}
