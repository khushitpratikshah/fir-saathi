import { afterEach, describe, expect, it } from "vitest";
import { clearLocalAudioReview, getLocalAudioReview, retainLocalAudioReview } from "./localAudioReview";

describe("local audio review retention", () => {
  afterEach(() => clearLocalAudioReview("FS-TEST"));

  it("keeps a preview available only for the matching current-session record", () => {
    retainLocalAudioReview("FS-TEST", "blob:preview");
    expect(getLocalAudioReview("FS-TEST")).toBe("blob:preview");
    expect(getLocalAudioReview("FS-OTHER")).toBeNull();
  });
});
