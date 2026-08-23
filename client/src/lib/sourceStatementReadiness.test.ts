import { describe, expect, it } from "vitest";
import { getSourceStatementReadiness } from "./sourceStatementReadiness";

describe("getSourceStatementReadiness", () => {
  it("counts a trimmed, multilingual statement without changing the source text", () => {
    expect(getSourceStatementReadiness("  मेरा फोन चोरी हो गया  ")).toEqual({
      characterCount: 20,
      wordCount: 5,
      isReady: true,
    });
  });

  it("keeps short or blank source statements in a not-ready state", () => {
    expect(getSourceStatementReadiness("  short ")).toEqual({ characterCount: 5, wordCount: 1, isReady: false });
    expect(getSourceStatementReadiness("   ")).toEqual({ characterCount: 0, wordCount: 0, isReady: false });
  });
});
