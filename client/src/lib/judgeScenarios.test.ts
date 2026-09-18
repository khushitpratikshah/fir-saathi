import { describe, expect, it } from "vitest";
import {
  JUDGE_SCENARIOS,
  buildVerifierTrace,
  highlightSource,
} from "./judgeScenarios";

describe("judge fast-path scenarios", () => {
  it("keeps all demo extraction values as exact source substrings", () => {
    for (const scenario of JUDGE_SCENARIOS) {
      expect(
        scenario.extracted.every(field =>
          scenario.transcript.includes(field.value)
        )
      ).toBe(true);
    }
  });

  it("shows adversarial fields as deterministic drops rather than accepted facts", () => {
    const scenario = JUDGE_SCENARIOS.find(
      item => item.id === "prompt-injection"
    );
    expect(scenario?.dropped).toContain("BNS 999");
    expect(
      buildVerifierTrace(
        scenario!.transcript,
        scenario!.extracted,
        scenario!.dropped
      ).matched
    ).toHaveLength(3);
  });

  it("highlights only exact contiguous source matches", () => {
    const parts = highlightSource("A red bag was taken", [
      "red bag",
      "not present",
    ]);
    expect(
      parts.filter(part => part.highlighted).map(part => part.text)
    ).toEqual(["red bag"]);
  });
});
