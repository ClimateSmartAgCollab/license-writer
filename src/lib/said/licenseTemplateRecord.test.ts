import { describe, it, expect } from "vitest";
import {
  buildLicenseTemplateRecord,
  saidifyRecord,
  verifyRecord,
  toSaidJsonString,
  detectAndParseSaidJson,
  resolveSaidJsonUpload,
} from "./licenseTemplateRecord";
import type {
  LicenseTemplateRecord,
  LicenseTemplateRecordInput,
} from "@/types/licenseTemplateRecord";

describe("licenseTemplateRecord", () => {
  it("builds → saidifies → verifies a record end-to-end", () => {
    const input = buildLicenseTemplateRecord({
      jinjaText: "Hello {{ name }}, your license is {{ license_id }}.",
      ocaPackageD: "EOCA_EXAMPLE_DIGEST_PLACEHOLDER_01234567890",
      attributeNames: ["license_id", "name"],
    });

    const sad = saidifyRecord(input);

    expect(verifyRecord(sad)).toBe(true);
    expect(sad.d).not.toBe("");
    expect(typeof sad.d).toBe("string");
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
  });

  it("detectAndParseSaidJson extracts jinja from a valid SAID JSON file", () => {
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

  it("produces stable, parseable, verifiable on-disk JSON", () => {
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

    // The load-bearing assertion. If toSaidJsonString ever produces
    // bytes that don't match what saidify hashed (e.g. a future change
    // canonicalizes after saidify instead of before), this fails. The
    // older assertions above can all pass without round-trip integrity.
    expect(verifyRecord(parsed)).toBe(true);
  });
});
