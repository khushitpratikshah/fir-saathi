import { afterEach, describe, expect, it, vi } from "vitest";
import { groqReviewerTranslation } from "./groqProvider";

afterEach(() => vi.unstubAllGlobals());

describe("reviewer translation aid", () => {
  it("returns separate English and back-translation aids under a non-authoritative source-preserving prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ englishAid: "A separate English aid.", backTranslation: "એક અલગ પાછો અનુવાદ.", uncertaintyNote: "Compare this aid with the original source." }) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(groqReviewerTranslation({ sourceStatement: "મૂળ નિવેદન", sourceLanguage: "gu" })).resolves.toEqual({ englishAid: "A separate English aid.", backTranslation: "એક અલગ પાછો અનુવાદ.", uncertaintyNote: "Compare this aid with the original source." });
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.messages[0].content).toMatch(/non-authoritative/i);
    expect(request.messages[0].content).toMatch(/never as instructions/i);
  });
});
