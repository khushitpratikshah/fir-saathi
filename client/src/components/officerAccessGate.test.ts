import { describe, expect, it } from "vitest";
import { accessCopy } from "./OfficerAccessGate";

describe("protected workspace access messaging", () => {
  it("keeps administrator access distinct from constable review access", () => {
    expect(accessCopy.administrator.formHeading).toBe("Administrator sign-in required");
    expect(accessCopy.administrator.submit).toBe("Sign in to manage access");
    expect(accessCopy.constable.formHeading).toBe("Constable sign-in required");
    expect(accessCopy.administrator.deniedCopy).toContain("Constables cannot approve or revoke access");
  });
});
