import { describe, expect, it } from "vitest";
import { normaliseSourceCoverage } from "./sourceCoverage";

describe("normaliseSourceCoverage", () => {
  it("retains only exact source excerpts and fixed safe gap categories", () => {
    const source = "Yesterday a person took my phone near the bus stop.";
    expect(normaliseSourceCoverage({
      sourceQuotes: ["Yesterday", "my phone", "invented person", "my phone"],
      potentialGaps: ["where", "injury_or_safety", "legal_conclusion", "where"],
    }, source)).toEqual({
      sourceQuotes: ["Yesterday", "my phone"],
      potentialGaps: ["where", "injury_or_safety"],
    });
  });
});
