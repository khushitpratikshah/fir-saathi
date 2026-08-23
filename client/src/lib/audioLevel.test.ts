import { describe, expect, it } from "vitest";
import { getAudioLevelFeedback } from "./audioLevel";

describe("getAudioLevelFeedback", () => {
  it("identifies silence, usable speech, and a clipping risk", () => {
    expect(getAudioLevelFeedback(0.001, 0.01).state).toBe("silent");
    expect(getAudioLevelFeedback(0.08, 0.32)).toMatchObject({ state: "healthy", label: expect.stringContaining("looks good") });
    const clipping = getAudioLevelFeedback(0.18, 0.97);
    expect(clipping.state).toBe("loud");
    expect(clipping.level).toBeGreaterThanOrEqual(0.96);
  });
});
