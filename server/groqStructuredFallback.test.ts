import { afterEach, describe, expect, it, vi } from "vitest";
import { groqStructuredDraft } from "./groqProvider";

afterEach(() => vi.unstubAllGlobals());

describe("Groq structured drafting recovery", () => {
  it("retries with a JSON-object response after a strict-schema generation failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { type: "invalid_request_error", code: "failed_generation" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"fields":[],"missingDetails":[],"followUpQuestions":[],"bnsSuggestions":[]}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = await groqStructuredDraft({
      systemPrompt: "Return safe JSON.",
      userPrompt: "Source statement.",
      schema: { type: "object" },
    });

    expect(JSON.parse(output)).toEqual({ fields: [], missingDetails: [], followUpQuestions: [], bnsSuggestions: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(retryBody.response_format).toEqual({ type: "json_object" });
  });
});
