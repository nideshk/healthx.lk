import { describe, expect, it } from "vitest";
import en from "../src/messages/en.json";
import si from "../src/messages/si.json";
import review from "./fixtures/approved-patient-sinhala.json";

function readPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current == null || typeof current !== "object") return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
    return (current as Record<string, unknown>)[part];
  }, root);
}

describe("approved Sinhala catalog", () => {
  it("gives every applied English key a non-empty exact Sinhala value", () => {
    for (const row of review.applied) {
      const english = readPath(en, row.key);
      const sinhala = readPath(si, row.key);
      expect(english, `${row.id} ${row.key} en`).toBe(row.en);
      expect(sinhala, `${row.id} ${row.key} si`).toBe(row.si);
      expect(typeof sinhala, row.id).toBe("string");
      expect((sinhala as string).trim(), row.id).not.toBe("");
    }
  });

  it("leaves the reviewed existing Sinhala unchanged", () => {
    for (const row of review.preserved) {
      expect(readPath(en, row.key), `${row.id} ${row.key} en`).toBe(row.en);
      expect(readPath(si, row.key), `${row.id} ${row.key} si`).toBe(row.si);
    }
  });

  it("keeps the consent terms placeholder until a full translation exists", () => {
    expect(si.consentForm.telehealthContent.toLowerCase()).toContain("coming soon");
  });
});
