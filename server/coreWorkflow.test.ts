import { describe, expect, it } from "vitest";
import { getCaseReadiness } from "../client/src/components/CaseReadinessPanel";
import { SUPPORTED_LANGUAGES } from "../shared/firSaathi";

describe("multilingual core workflow", () => {
  it("keeps the expanded explicit language list available to every intake contract", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(["en", "hi", "gu", "mr", "bn", "ta", "te", "kn", "ml", "pa"]);
  });

  it("marks separate citizen context and a post-return clarification as review-ready signals", () => {
    const checks = getCaseReadiness({
      fields: [
        { fieldKey: "location", source: "source_statement", verificationState: "unverified" },
        { fieldKey: "context_incident_when", source: "citizen_context", verificationState: "citizen_confirmed" },
        { fieldKey: "context_incident_where", source: "citizen_context", verificationState: "citizen_confirmed" },
      ],
      audit: [
        { eventType: "returned", createdAt: new Date("2026-08-01T10:00:00.000Z") },
        { eventType: "clarification_added", createdAt: new Date("2026-08-01T11:00:00.000Z") },
      ],
      draft: { missingDetails: [] },
      evidenceCount: 1,
      status: "returned",
    });
    expect(checks.filter((check) => check.complete)).toHaveLength(6);
    expect(checks.find((check) => check.label === "Clarification loop")?.detail).toContain("Citizen added a response");
  });
});
