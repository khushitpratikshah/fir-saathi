import { describe, expect, it } from "vitest";
import { processSteps } from "./ProcessStory";

describe("FIR Saathi process story", () => {
  it("keeps every citizen-to-constable stage explicit and human-centred", () => {
    expect(processSteps).toHaveLength(6);
    expect(processSteps.map((step) => step.number)).toEqual(["01", "02", "03", "04", "05", "06"]);
    expect(processSteps.every((step) => step.ai.length > 0 && step.human.length > 0)).toBe(true);
    expect(processSteps.at(-1)?.title).toBe("A constable verifies");
  });
});
