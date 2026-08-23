import { describe, expect, it } from "vitest";
import { assessTranscriptionQuality } from "./groqProvider";

describe("transcription quality assessment", () => {
  it("asks for a retry when a transcript is too short or mostly non-speech", () => {
    expect(assessTranscriptionQuality({ text: "Hi", segments: [] }).assessment).toBe("retry");
    expect(assessTranscriptionQuality({ text: "A longer but likely non-speech result", segments: [{ no_speech_prob: 0.8 }, { no_speech_prob: 0.76 }] }).assessment).toBe("retry");
  });

  it("flags uncertain segments for careful citizen read-back without rewriting text", () => {
    expect(assessTranscriptionQuality({ text: "My phone was taken at the bus stop yesterday.", segments: [{ avg_logprob: -0.92, no_speech_prob: 0.08 }] })).toMatchObject({ assessment: "review", lowConfidenceSegments: 1 });
  });

  it("accepts clear transcription metadata", () => {
    expect(assessTranscriptionQuality({ text: "My phone was taken at the bus stop yesterday.", segments: [{ avg_logprob: -0.12, no_speech_prob: 0.01, compression_ratio: 1.4 }] }).assessment).toBe("clear");
  });
});
