import { describe, expect, it } from "vitest";
import { experimentalLanguageCodes, languages } from "./languages";

describe("language catalogue", () => {
  it("marks every unverified language as experimental", () => {
    expect(languages.filter((language) => !language.experimental).map((language) => language.code)).toEqual(["en", "hi", "gu"]);
    expect(experimentalLanguageCodes).toEqual(["mr", "bn", "ta", "te", "kn", "ml", "pa"]);
  });

  it("keeps the native labels available for every supported language", () => {
    expect(languages).toHaveLength(10);
    expect(languages.every((language) => language.label && language.native)).toBe(true);
  });
});
