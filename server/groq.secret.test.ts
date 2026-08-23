import { describe, expect, it } from "vitest";

describe("Groq portable provider configuration", () => {
  it("can reach Groq’s OpenAI-compatible models endpoint", async () => {
    const apiKey = process.env.GROQ_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
