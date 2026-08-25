export type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
  avgLogprob?: number;
};

export type TranscriptConfidenceCalibration = {
  status: "calibrated";
  threshold: number;
  precision: number;
  recall: number;
  sampleCount: number;
  model: string;
  corpus: string;
  evaluatedAt: string;
};

/**
 * No calibrated reference set has been recorded for the configured provider.
 * Raw avg_logprob remains available for future evaluation but must not drive an
 * amber citizen-facing warning until a provider-matched calibration is added.
 */
export const ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION: TranscriptConfidenceCalibration | null = null;

export function isLowConfidenceSegment(segment: TranscriptSegment, calibration = ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION) {
  return calibration !== null && typeof segment.avgLogprob === "number" && segment.avgLogprob <= calibration.threshold;
}

export function transcriptConfidenceNotice(calibration = ACTIVE_TRANSCRIPT_CONFIDENCE_CALIBRATION) {
  return calibration
    ? `Highlighted segments use a threshold calibrated on ${calibration.sampleCount} reference segments from ${calibration.corpus}.`
    : "No validated error-rate calibration is available for this provider and language, so log-probability metadata is not used to highlight wording.";
}

export function formatTranscriptTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function buildTranscriptCorrectionValue(input: { passage: string; startSeconds: number; endSeconds: number; note: string }) {
  return `Citizen correction note for “${input.passage.trim()}” at ${formatTranscriptTime(input.startSeconds)}–${formatTranscriptTime(input.endSeconds)}: ${input.note.trim()}`;
}
