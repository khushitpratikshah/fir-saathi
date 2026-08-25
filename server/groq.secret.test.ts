import { describe, expect, it } from "vitest";

const describeLive = process.env.RUN_LIVE_PROVIDER_TESTS === "1" ? describe : describe.skip;

describeLive("Groq portable provider configuration", () => {
  it("can reach Groq’s OpenAI-compatible models endpoint", async () => {
    const apiKey = process.env.GROQ_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
