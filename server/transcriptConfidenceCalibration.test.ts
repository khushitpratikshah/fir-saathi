import { describe, expect, it } from "vitest";
import { calculateCalibrationMetrics, selectTranscriptConfidenceCalibration } from "./transcriptConfidenceCalibration";

describe("transcript confidence calibration", () => {
  it("computes precision and recall from reference-checked segments", () => {
    expect(calculateCalibrationMetrics([{ avgLogprob: -1, hasReferenceError: true }, { avgLogprob: -0.9, hasReferenceError: false }, { avgLogprob: -0.2, hasReferenceError: true }], -0.85)).toMatchObject({ truePositive: 1, falsePositive: 1, falseNegative: 1, precision: 0.5, recall: 0.5 });
  });

  it("refuses to activate a citizen-facing threshold without an adequately sized reference set", () => {
    expect(() => selectTranscriptConfidenceCalibration({ samples: [{ avgLogprob: -1, hasReferenceError: true }], model: "test", corpus: "test", evaluatedAt: "2026-08-25" })).toThrow(/100 independently reference-checked/i);
  });
});
