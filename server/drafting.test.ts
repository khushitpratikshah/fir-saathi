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

  it("drops out-of-catalogue or non-source-grounded legal suggestions and returns safe REVIEW", () => {
    expect(normaliseBnsSuggestions([
      { sectionCode: "BNS 999", title: "Invented", confidence: "high", rationale: "Unsupported", sourceQuotes: ["taken"], missingFactors: [], suitability: "possible_match" },
    ], "My phone was taken.")).toMatchObject([{
      sectionCode: "REVIEW",
      title: "Officer review required",
      confidence: "review",
    }]);
    expect(normaliseBnsSuggestions([
      { sectionCode: "BNS 303", title: "Theft", confidence: "medium", rationale: "Not in record", sourceQuotes: ["invented detail"], missingFactors: [], suitability: "possible_match" },
    ], "My phone was taken.")[0]?.sectionCode).toBe("REVIEW");
  });

  it("retains only catalogue suggestions with exact source evidence and preserves uncertainty", () => {
    const suggestions = normaliseBnsSuggestions([
      { sectionCode: "BNS 303", title: "Wrong title", confidence: "high", rationale: "The source describes a phone being taken.", sourceQuotes: ["my phone was taken"], missingFactors: ["Consent is not stated in the source."], suitability: "possible_match" },
    ], "Yesterday my phone was taken near the bus stop.");
    expect(suggestions).toMatchObject([{
      sectionCode: "BNS 303",
      title: "Theft",
      sourceQuotes: ["my phone was taken"],
      missingFactors: ["Consent is not stated in the source."],
      suitability: "possible_match",
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
