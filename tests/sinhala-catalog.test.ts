import { readFileSync } from "node:fs";
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

  it("uses the official Sinhala telehealth consent instead of the placeholder", () => {
    const placeholder =
      "මෙම ලේඛනයේ සම්පූර්ණ සිංහල පරිවර්තනය සඳහා කරුණාකර අපගේ සහාය කණ්ඩායම අමතන්න: support@squarecoin.com.au. (Full translation coming soon)";
    const value = si.consentForm.telehealthContent;
    expect(value).not.toBe(placeholder);
    expect(value.toLowerCase()).not.toContain("coming soon");
    expect(value).toContain("ටෙලිහෙල්ත්, ඩිජිටල් හෙල්ත් සහ ප්ලැට්ෆෝමයට අනුමැතිය දීම");
    expect(value).toContain("I. ප්ලැට්ෆෝමය පිලිබඳ තොරතුරු");
    expect(value).toContain("පැය 12");

    const markdown = readFileSync(
      new URL("../public/content/telehealth-si.md", import.meta.url),
      "utf8"
    );
    expect(markdown.toLowerCase()).not.toContain("coming soon");
    expect(markdown).toContain("<h2>I. ප්ලැට්ෆෝමය පිලිබඳ තොරතුරු</h2>");
    expect(markdown).toContain("අවලංගු කිරීමට හැකි කාල සීමාව");
  });
});
