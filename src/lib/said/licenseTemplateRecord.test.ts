import { describe, it, expect } from "vitest";
import { saidify } from "saidify";
import { canonicalize } from "json-canonicalize";
import {
  buildLicenseTemplateRecord,
  saidifyRecord,
  verifyRecord,
  isUrnSaidDigest,
  toSaidJsonString,
  detectAndParseSaidJson,
  resolveSaidJsonUpload,
} from "./licenseTemplateRecord";
import type {
  LicenseTemplateRecord,
  LicenseTemplateRecordInput,
} from "@/types/licenseTemplateRecord";

/** Pre-migration bare-SAID produce path — for legacy verify tests only. */
function saidifyRecordBare(
  input: LicenseTemplateRecordInput,
): LicenseTemplateRecord {
  const canonicalInput = JSON.parse(
    canonicalize(input),
  ) as Record<string, unknown>;
  const [, sad] = saidify(canonicalInput, "d");
  return sad as unknown as LicenseTemplateRecord;
}

const LEGACY_BARE_SAID_FIXTURE: LicenseTemplateRecord = {
  d: "EPHtXmY02vU0_I26ynZeoe--tqyi2jWEJ0GCk6egPdHe",
  jinja: `Data request
Requester name and affiliations
{{ name }}
{{ affiliation }}

Research project proposal
{{ title }}

Description: {{ description }}

Outcomes: {{ outcomes }}

Timeline: {{ timeline }}

Data request justification
{{ justification }}`,
  oca_package_d: "EKwwo0ojFOyZGK10QhgKK-xo1axX2xl1aSs8_8yD-fK3",
  type: "license_template/1.0",
};

describe("licenseTemplateRecord", () => {
  it("builds → saidifies → verifies a record end-to-end (urn produce)", () => {
    const input = buildLicenseTemplateRecord({
      jinjaText: "Hello {{ name }}, your license is {{ license_id }}.",
      ocaPackageD: "EOCA_EXAMPLE_DIGEST_PLACEHOLDER_01234567890",
      attributeNames: ["license_id", "name"],
    });

    const sad = saidifyRecord(input);

    expect(verifyRecord(sad)).toBe(true);
    expect(isUrnSaidDigest(sad.d)).toBe(true);
    expect(sad.d).toHaveLength(53);
  });

  it("detects tampering in the jinja field", () => {
    const input = buildLicenseTemplateRecord({
      jinjaText: "Hello {{ name }}",
      ocaPackageD: null,
      attributeNames: ["name"],
    });
    const sad = saidifyRecord(input);

    const tampered = { ...sad, jinja: "Hello {{ name}}" };
    expect(verifyRecord(tampered)).toBe(false);
  });

  it("throws when called on an already-SAIDified record", () => {
    const input = buildLicenseTemplateRecord({
      jinjaText: "X",
      ocaPackageD: null,
      attributeNames: [],
    });
    const sad = saidifyRecord(input);

    expect(() =>
      saidifyRecord(sad as unknown as LicenseTemplateRecordInput),
    ).toThrow(/d/);
  });

  it("produces identical SAIDs regardless of attributeNames input order", () => {
    const shared = {
      jinjaText: "Hi {{ first }} {{ last }}",
      ocaPackageD: "EXYZ",
    };

    const sadA = saidifyRecord(
      buildLicenseTemplateRecord({
        ...shared,
        attributeNames: ["first", "last"],
      }),
    );
    const sadB = saidifyRecord(
      buildLicenseTemplateRecord({
        ...shared,
        attributeNames: ["last", "first"],
      }),
    );

    expect(sadA.d).toEqual(sadB.d);
    expect(isUrnSaidDigest(sadA.d)).toBe(true);
  });

  it("detectAndParseSaidJson extracts jinja from a valid urn SAID JSON file", () => {
    const sad = saidifyRecord(
      buildLicenseTemplateRecord({
        jinjaText: "Round-trip me {{ name }}",
        ocaPackageD: null,
        attributeNames: ["name"],
      }),
    );
    const onDiskBytes = toSaidJsonString(sad);

    const result = detectAndParseSaidJson(onDiskBytes);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.saidVerified).toBe(true);
      expect(result.record.jinja).toBe("Round-trip me {{ name }}");
      expect(result.record.d).toBe(sad.d);
      expect(isUrnSaidDigest(result.record.d)).toBe(true);
    }
  });

  it("detectAndParseSaidJson returns unverified record for a tampered SAID JSON file", () => {
    const sad = saidifyRecord(
      buildLicenseTemplateRecord({
        jinjaText: "Original content",
        ocaPackageD: null,
        attributeNames: [],
      }),
    );
    const tampered = { ...sad, jinja: "Altered content" };
    const tamperedBytes = JSON.stringify(tampered);

    const result = detectAndParseSaidJson(tamperedBytes);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.saidVerified).toBe(false);
      expect(result.record.jinja).toBe("Altered content");
    }
  });

  it("detectAndParseSaidJson rejects structurally invalid JSON missing jinja", () => {
    const invalidBytes = JSON.stringify({
      d: "EXAMPLE_DIGEST",
      type: "license_template/1.0",
    });

    const result = detectAndParseSaidJson(invalidBytes);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("missing required fields");
    }
  });

  describe("resolveSaidJsonUpload", () => {
    it("returns reject for structural parse failure", () => {
      expect(
        resolveSaidJsonUpload({ valid: false, reason: "not JSON" }),
      ).toBe("reject");
    });

    it("returns load when SAID verification passed", () => {
      const sad = saidifyRecord(
        buildLicenseTemplateRecord({
          jinjaText: "Verified",
          ocaPackageD: null,
          attributeNames: [],
        }),
      );
      const result = detectAndParseSaidJson(toSaidJsonString(sad));
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(resolveSaidJsonUpload(result)).toBe("load");
      }
    });

    it("returns confirm when SAID verification failed", () => {
      const sad = saidifyRecord(
        buildLicenseTemplateRecord({
          jinjaText: "Original",
          ocaPackageD: null,
          attributeNames: [],
        }),
      );
      const tampered = { ...sad, jinja: "Altered" };
      const result = detectAndParseSaidJson(JSON.stringify(tampered));
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(resolveSaidJsonUpload(result)).toBe("confirm");
      }
    });
  });

  it("produces stable, parseable, verifiable on-disk JSON (urn)", () => {
    const sad = saidifyRecord(
      buildLicenseTemplateRecord({
        jinjaText: "X",
        ocaPackageD: null,
        attributeNames: ["a"],
      }),
    );

    const json1 = toSaidJsonString(sad);
    const json2 = toSaidJsonString(sad);
    expect(json1).toBe(json2);

    const parsed = JSON.parse(json1) as LicenseTemplateRecord;
    expect(parsed.d).toBe(sad.d);
    expect(isUrnSaidDigest(parsed.d)).toBe(true);

    expect(verifyRecord(parsed)).toBe(true);
  });

  describe("legacy bare-SAID verify path", () => {
    it("verifies a bare-SAID record produced by plain saidify", () => {
      const input = buildLicenseTemplateRecord({
        jinjaText: "Legacy bare export",
        ocaPackageD: "EKwwo0ojFOyZGK10QhgKK-xo1axX2xl1aSs8_8yD-fK3",
        attributeNames: [],
      });
      const sad = saidifyRecordBare(input);

      expect(isUrnSaidDigest(sad.d)).toBe(false);
      expect(sad.d).toHaveLength(44);
      expect(verifyRecord(sad)).toBe(true);
    });

    it("verifies the real pre-migration conversation fixture", () => {
      expect(isUrnSaidDigest(LEGACY_BARE_SAID_FIXTURE.d)).toBe(false);
      expect(verifyRecord(LEGACY_BARE_SAID_FIXTURE)).toBe(true);
    });

    it("loads a legacy bare-SAID JSON file through detectAndParseSaidJson", () => {
      const result = detectAndParseSaidJson(
        JSON.stringify(LEGACY_BARE_SAID_FIXTURE),
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.saidVerified).toBe(true);
        expect(resolveSaidJsonUpload(result)).toBe("load");
      }
    });
  });

  describe("urn produce path", () => {
    it("produces urn:said for the real conversation example object", () => {
      const input = buildLicenseTemplateRecord({
        jinjaText: LEGACY_BARE_SAID_FIXTURE.jinja,
        ocaPackageD: LEGACY_BARE_SAID_FIXTURE.oca_package_d,
        attributeNames: [],
      });

      const sad = saidifyRecord(input);

      expect(sad.d).toBe(
        "urn:said:EAyS7MMgZuB0RVCAoK56sL4gQOLrc8s6z_VkZ68jYXBM",
      );
      expect(isUrnSaidDigest(sad.d)).toBe(true);
      expect(sad.d).toHaveLength(53);
      expect(verifyRecord(sad)).toBe(true);
      expect(sad.d).not.toBe(`urn:said:${LEGACY_BARE_SAID_FIXTURE.d}`);
    });
  });
});
