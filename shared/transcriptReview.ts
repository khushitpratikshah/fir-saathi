export type TranscriptSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export function formatTranscriptTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function buildTranscriptCorrectionValue(input: { passage: string; startSeconds: number; endSeconds: number; note: string }) {
  return `Citizen correction note for “${input.passage.trim()}” at ${formatTranscriptTime(input.startSeconds)}–${formatTranscriptTime(input.endSeconds)}: ${input.note.trim()}`;
}
