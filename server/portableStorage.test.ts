import { describe, expect, it } from "vitest";
import { portableEvidencePut, portableEvidenceRemove, portableEvidenceSignedUrl } from "./portableStorage";

describe("portable Supabase evidence storage", () => {
  it("stores and retrieves encrypted synthetic bytes through a signed URL", async () => {
    const input = Buffer.from("fir-saathi-portable-storage-test", "utf8");
    const stored = await portableEvidencePut("test-cleanup", input);
    try {
      const signedUrl = await portableEvidenceSignedUrl(stored.key);
      const response = await fetch(signedUrl);
      expect(response.ok).toBe(true);
      expect(Buffer.from(await response.arrayBuffer())).toEqual(input);
    } finally {
      await portableEvidenceRemove(stored.key);
    }
  }, 20_000);
});
