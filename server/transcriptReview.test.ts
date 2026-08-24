import { describe, expect, it } from "vitest";
import { buildTranscriptCorrectionValue, formatTranscriptTime } from "../shared/transcriptReview";

describe("timestamped transcript corrections", () => {
  it("keeps the exact selected passage and correction note separate from the source record", () => {
    expect(formatTranscriptTime(65.8)).toBe("01:05");
    expect(buildTranscriptCorrectionValue({ passage: "black motorcycle", startSeconds: 7, endSeconds: 10, note: "I meant a black scooter." })).toBe("Citizen correction note for “black motorcycle” at 00:07–00:10: I meant a black scooter.");
  });
});
