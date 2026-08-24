import { describe, expect, it } from "vitest";
import { buildTranscriptCorrectionValue, formatTranscriptTime } from "./transcriptReview";

describe("transcript review helpers", () => {
  it("formats source timestamps predictably", () => {
    expect(formatTranscriptTime(65.8)).toBe("01:05");
  });

  it("keeps the selected passage and citizen note visibly separate from the source transcript", () => {
    expect(buildTranscriptCorrectionValue({ passage: "black motorcycle", startSeconds: 7, endSeconds: 10, note: "I meant a black scooter." })).toBe("Citizen correction note for “black motorcycle” at 00:07–00:10: I meant a black scooter.");
  });
});
