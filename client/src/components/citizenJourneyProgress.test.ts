import { describe, expect, it } from "vitest";
import { formatCurrentTask } from "./CitizenJourneyProgress";

describe("citizen journey progress", () => {
  it("clarifies that initial language selection sets the statement source language", () => {
    expect(formatCurrentTask("Choose language")).toBe("Select source language");
    expect(formatCurrentTask("Review your words")).toBe("Review your words");
  });
});
