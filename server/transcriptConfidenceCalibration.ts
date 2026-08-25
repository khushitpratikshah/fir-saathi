import type { TranscriptConfidenceCalibration } from "../shared/transcriptReview";

export type ReferenceTranscriptSegment = {
  avgLogprob: number;
  hasReferenceError: boolean;
};

export type CalibrationMetrics = {
  threshold: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
};

export function calculateCalibrationMetrics(samples: ReferenceTranscriptSegment[], threshold: number): CalibrationMetrics {
  const truePositive = samples.filter((sample) => sample.hasReferenceError && sample.avgLogprob <= threshold).length;
  const falsePositive = samples.filter((sample) => !sample.hasReferenceError && sample.avgLogprob <= threshold).length;
  const falseNegative = samples.filter((sample) => sample.hasReferenceError && sample.avgLogprob > threshold).length;
  const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, truePositive, falsePositive, falseNegative, precision, recall, f1 };
}

export function selectTranscriptConfidenceCalibration(input: { samples: ReferenceTranscriptSegment[]; model: string; corpus: string; evaluatedAt: string; minimumPrecision?: number }): TranscriptConfidenceCalibration {
  if (input.samples.length < 100) throw new Error("At least 100 independently reference-checked segments are required before enabling citizen-facing confidence highlighting.");
  const minimumPrecision = input.minimumPrecision ?? 0.7;
  const candidates = Array.from(new Set(input.samples.map((sample) => sample.avgLogprob))).sort((a, b) => a - b);
  const eligible = candidates.map((threshold) => calculateCalibrationMetrics(input.samples, threshold)).filter((metric) => metric.precision >= minimumPrecision && metric.recall > 0);
  if (!eligible.length) throw new Error("No log-probability threshold meets the requested minimum precision; keep confidence highlighting disabled.");
  const selected = eligible.sort((a, b) => b.f1 - a.f1 || b.precision - a.precision || b.recall - a.recall)[0]!;
  return { status: "calibrated", threshold: selected.threshold, precision: selected.precision, recall: selected.recall, sampleCount: input.samples.length, model: input.model, corpus: input.corpus, evaluatedAt: input.evaluatedAt };
}
