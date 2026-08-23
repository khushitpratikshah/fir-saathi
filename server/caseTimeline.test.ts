import { describe, expect, it } from "vitest";
import { buildCaseTimeline } from "../client/src/components/CaseStatusTimeline";

const at = (eventType: string, atTime: string) => ({ eventType, createdAt: new Date(atTime), actorLabel: "Test actor" });

describe("case-status timeline", () => {
  it("uses the newest real audit event for each completed lifecycle step", () => {
    const timeline = buildCaseTimeline("ready_for_review", [at("drafted", "2026-08-01T11:00:00.000Z"), at("created", "2026-08-01T09:00:00.000Z"), at("drafted", "2026-08-01T12:00:00.000Z"), at("citizen_confirmed", "2026-08-01T13:00:00.000Z")]);
    expect(timeline.stages.map((stage) => stage.label)).toEqual(["Intake created", "Draft prepared", "Citizen confirmed", "Human verified"]);
    expect(timeline.stages[1].event?.createdAt.toISOString()).toBe("2026-08-01T12:00:00.000Z");
    expect(timeline.stages[3].event).toBeUndefined();
  });

  it("shows the returned clarification loop before a future human verification", () => {
    const timeline = buildCaseTimeline("returned", [at("created", "2026-08-01T09:00:00.000Z"), at("drafted", "2026-08-01T10:00:00.000Z"), at("citizen_confirmed", "2026-08-01T11:00:00.000Z"), at("returned", "2026-08-01T12:00:00.000Z")]);
    expect(timeline.stages.map((stage) => stage.label)).toEqual(["Intake created", "Draft prepared", "Citizen confirmed", "Clarification requested", "Citizen clarified", "Human verified"]);
    expect(timeline.returned?.actorLabel).toBe("Test actor");
  });
});
