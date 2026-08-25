import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { selectTranscriptConfidenceCalibration, type ReferenceTranscriptSegment } from "./transcriptConfidenceCalibration";

type CalibrationInput = {
  model: string;
  corpus: string;
  evaluatedAt: string;
  segments: ReferenceTranscriptSegment[];
};

function isCalibrationInput(value: unknown): value is CalibrationInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CalibrationInput>;
  return typeof candidate.model === "string"
    && typeof candidate.corpus === "string"
    && typeof candidate.evaluatedAt === "string"
    && Array.isArray(candidate.segments)
    && candidate.segments.every((segment) => segment && typeof segment.avgLogprob === "number" && typeof segment.hasReferenceError === "boolean");
}

async function main() {
  const configuredPath = process.env.TRANSCRIPT_CALIBRATION_INPUT;
  if (!configuredPath) throw new Error("Set TRANSCRIPT_CALIBRATION_INPUT to a JSON file of independently reference-checked segments.");
  const inputPath = resolve(process.cwd(), configuredPath);
  const parsed = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  if (!isCalibrationInput(parsed)) throw new Error("Calibration input does not match the documented reference-segment format.");

  const calibration = selectTranscriptConfidenceCalibration({ ...parsed, samples: parsed.segments });
  const outputPath = resolve(process.cwd(), "docs/evaluations/transcript-confidence-calibration-latest.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ calibration, sourceInput: configuredPath }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, calibration }, null, 2));
}

void main();
