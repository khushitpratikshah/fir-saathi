import { describe, expect, it } from "vitest";
import { isPrototypeRecordReference, normalizeCitizenRecoveryInput, shouldReportReadBackError } from "./citizenRecovery";

describe("citizen recovery helpers", () => {
  it("recognizes the short prototype record references shown to citizens", () => {
    expect(normalizeCitizenRecoveryInput(" fs-44yhnx ")).toBe("FS-44YHNX");
    expect(isPrototypeRecordReference("FS-44YHNX")).toBe(true);
    expect(isPrototypeRecordReference("FSR-ABCD1234")).toBe(false);
  });

  it("does not report benign browser cancellation after read-back begins", () => {
    expect(shouldReportReadBackError("canceled")).toBe(false);
    expect(shouldReportReadBackError("interrupted")).toBe(false);
    expect(shouldReportReadBackError("network")).toBe(true);
    expect(shouldReportReadBackError("synthesis-failed")).toBe(true);
  });
});
