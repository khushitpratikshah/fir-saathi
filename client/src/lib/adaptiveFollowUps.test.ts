import { describe, expect, it } from "vitest";
import { getAdaptiveFollowUps, getCitizenChosenContextOptions } from "./adaptiveFollowUps";

describe("adaptive citizen follow-ups", () => {
  it("asks only high-value details absent from both transcript fields and citizen context", () => {
    const questions = getAdaptiveFollowUps([
      { key: "date_time", source: "source_statement" },
      { key: "context_incident_where", source: "citizen_context" },
    ]);
    expect(questions.map((question) => question.key)).toEqual(["injury_or_safety"]);
  });

  it("does not ask a source-supported safety question again", () => {
    expect(getAdaptiveFollowUps([{ key: "threat_or_safety", source: "source_statement" }]).map((question) => question.key)).not.toContain("injury_or_safety");
  });

  it("does not repeat a clearly spoken time when extraction missed the date-time field", () => {
    const source = "Yesterday evening, around 7:30 PM, I was waiting at the bus stand.";
    expect(getAdaptiveFollowUps([], source).map((question) => question.key)).not.toContain("incident_when");
  });

  it("keeps less-common context available only when the citizen chooses it", () => {
    expect(getCitizenChosenContextOptions([{ key: "property", source: "source_statement" }]).map((question) => question.key)).toEqual(["people_or_vehicle", "follow_up_contact"]);
  });
});
