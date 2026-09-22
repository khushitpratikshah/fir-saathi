import { describe, expect, it } from "vitest";
import { isSyntheticDemoReviewer, SYNTHETIC_DEMO_EMAIL, SYNTHETIC_DEMO_PUBLIC_ID } from "./demoMode";

describe("synthetic demo reviewer", () => {
  it("recognises only the dedicated demo email", () => {
    expect(isSyntheticDemoReviewer({ email: SYNTHETIC_DEMO_EMAIL.toUpperCase() })).toBe(true);
    expect(isSyntheticDemoReviewer({ email: "someone@example.com" })).toBe(false);
    expect(isSyntheticDemoReviewer(null)).toBe(false);
  });

  it("keeps the demo case reference explicit", () => {
    expect(SYNTHETIC_DEMO_PUBLIC_ID).toBe("FS-DEMO1KYC");
  });
});
