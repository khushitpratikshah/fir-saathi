import { describe, expect, it } from "vitest";
import { userFacingGroqError } from "../client/src/lib/groqTranscription";

describe("Groq transcription recovery messages", () => {
  it("gives a safe timeout recovery path", () => {
    expect(userFacingGroqError("The portable AI provider did not respond in time.")).toContain("retry");
  });

  it("gives an actionable busy-provider recovery path", () => {
    expect(userFacingGroqError("Portable transcription provider returned 429.")).toContain("temporarily busy");
  });

  it("keeps unexpected provider errors user-safe", () => {
    expect(userFacingGroqError("unexpected upstream detail")).toBe("Groq could not prepare a transcript from this recording. You can safely retry or type the statement instead.");
  });
});
