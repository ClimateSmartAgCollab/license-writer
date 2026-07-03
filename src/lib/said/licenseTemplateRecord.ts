import { saidify, verify } from "saidify";
import { canonicalize } from "json-canonicalize";
import type {
  LicenseTemplateRecord,
  LicenseTemplateRecordInput,
  SaidJsonParseResult,
} from "@/types/licenseTemplateRecord";


export function buildLicenseTemplateRecord(params: {
  jinjaText: string;
  ocaPackageD: string | null;
  attributeNames: string[];
}): LicenseTemplateRecordInput {
  // const sortedAttributeNames = [...params.attributeNames].sort();

  return {
    d: "",
    type: "license_template/1.0",
    jinja: params.jinjaText,
    oca_package_d: params.ocaPackageD,
    // attribute_names: sortedAttributeNames,
  };
}


export function saidifyRecord(
  input: LicenseTemplateRecordInput,
): LicenseTemplateRecord {
  if (!("d" in input)) {
    throw new Error("saidifyRecord: record is missing required `d` field.");
  }
  if (input.d !== "") {
    throw new Error(
      `saidifyRecord: record.d must be "" before SAIDify, got ${JSON.stringify(input.d)}.`,
    );
  }

  const canonicalString = canonicalize(input);
  const canonicalInput = JSON.parse(canonicalString) as Record<string, unknown>;

  const [said, sad] = saidify(canonicalInput, "d");

  if (typeof said !== "string" || said.length === 0) {
    throw new Error("saidifyRecord: saidify() returned an empty digest.");
  }

  return sad as unknown as LicenseTemplateRecord;
}


export function verifyRecord(sad: LicenseTemplateRecord): boolean {
  if (typeof sad.d !== "string" || sad.d.length === 0) {
    return false;
  }

  return verify(
    sad as unknown as Record<string, unknown>,
    sad.d,
    "d",
  );
}


export function toSaidJsonString(sad: LicenseTemplateRecord): string {
  return JSON.stringify(sad);
}

export function resolveSaidJsonUpload(
  result: SaidJsonParseResult,
): "load" | "confirm" | "reject" {
  if (!result.valid) {
    return "reject";
  }
  if (result.saidVerified) {
    return "load";
  }
  return "confirm";
}

export function detectAndParseSaidJson(
  rawText: string,
): SaidJsonParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { valid: false, reason: "not JSON" };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return { valid: false, reason: "missing required fields" };
  }

  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.d !== "string" ||
    candidate.d.length === 0 ||
    typeof candidate.jinja !== "string" ||
    typeof candidate.type !== "string"
  ) {
    return { valid: false, reason: "missing required fields" };
  }

  const record = candidate as unknown as LicenseTemplateRecord;
  const saidVerified = verifyRecord(record);

  return { valid: true, record, saidVerified };
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
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
