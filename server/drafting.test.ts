import { describe, expect, it } from "vitest";
import { normaliseBnsSuggestions, normaliseFields, safeFallback } from "./drafting";

describe("FIR Saathi source-preserving drafting safeguards", () => {
  it("retains only field values that are exact excerpts from the source statement", () => {
    const source = "मुझे दुकान के पास किसी ने रोका।";
    const fields = normaliseFields([
      { key: "location", label: "Location detail", sourceQuote: "दुकान के पास", required: true, confidence: "high" },
      { key: "person", label: "Invented person", sourceQuote: "two men", required: true, confidence: "high" },
    ], source);

    expect(fields).toEqual([{
      key: "location",
      label: "Location detail",
      value: "दुकान के पास",
      sourceQuote: "दुकान के पास",
      required: true,
      source: "source_statement",
      confidence: "high",
    }]);
  });

  it("drops out-of-allow-list legal suggestions and returns safe REVIEW", () => {
    expect(normaliseBnsSuggestions([
      { sectionCode: "BNS 999", title: "Invented", confidence: "high", rationale: "Unsupported" },
    ])).toEqual([{
      sectionCode: "REVIEW",
      title: "Officer review required",
      confidence: "review",
      rationale: "No demonstrative allow-list reference is suitable from the available account.",
    }]);
  });

  it("uses a non-authoritative review fallback whenever drafting is unavailable", () => {
    const draft = safeFallback("Service unavailable");
    expect(draft.fields).toEqual([]);
    expect(draft.missingDetails).toEqual(["Service unavailable"]);
    expect(draft.bnsSuggestions[0]?.sectionCode).toBe("REVIEW");
    expect(draft.sourcePreservationNote).toContain("does not translate");
  });
});
