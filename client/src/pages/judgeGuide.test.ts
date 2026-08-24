import { describe, expect, it } from "vitest";
import { judgeWalkthrough } from "./JudgeGuide";

describe("judge demo guide", () => {
  it("keeps the concise walkthrough ordered from citizen framing to human review", () => {
    expect(judgeWalkthrough).toHaveLength(6);
    expect(judgeWalkthrough.map((step) => step.time)).toEqual(["00:00", "00:30", "01:10", "01:45", "02:20", "02:45"]);
    expect(judgeWalkthrough.at(-1)?.title).toBe("End with human review");
  });
});
