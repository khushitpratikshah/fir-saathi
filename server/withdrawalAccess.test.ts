import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashCitizenAccessCode } from "./citizenAccess";

const supabaseRequestMock = vi.hoisted(() => vi.fn());

vi.mock("./supabase", () => ({
  supabaseRequest: supabaseRequestMock,
}));

import { requireCitizenAccess, rotateCitizenAccessCode, withdrawComplaint } from "./db";

const publicId = "FS-PRIVATE";
const originalCode = "FSC-0123456789ABCDEF0123456789ABCDEF01234567";

describe("citizen withdrawal and private access-code rotation", () => {
  let citizenAccessHash: string | null;
  let status: "ready_for_review" | "withdrawn";

  beforeEach(() => {
    citizenAccessHash = hashCitizenAccessCode(originalCode);
    status = "ready_for_review";
    supabaseRequestMock.mockReset();
    supabaseRequestMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.startsWith("fir_saathi_complaints?select=")) {
        return [{
          id: "00000000-0000-4000-8000-000000000123",
          public_id: publicId,
          citizen_access_hash: citizenAccessHash,
          language: "en",
          status,
          consent_at: "2026-08-25T00:00:00.000Z",
          citizen_confirmed_at: "2026-08-25T00:01:00.000Z",
          withdrawn_at: status === "withdrawn" ? "2026-08-25T00:02:00.000Z" : null,
          withdrawal_reason: status === "withdrawn" ? "Citizen withdrew active prototype record" : null,
          source_transcript: "A safe synthetic test statement.",
          draft_json: { fields: [], missingDetails: [], followUpQuestions: [], bnsSuggestions: [], sourcePreservationNote: "test" },
          created_at: "2026-08-25T00:00:00.000Z",
          updated_at: "2026-08-25T00:00:00.000Z",
        }];
      }
      if (path.startsWith("fir_saathi_complaints?id=eq.")) {
        const body = JSON.parse(String(options?.body ?? "{}"));
        if ("citizen_access_hash" in body) citizenAccessHash = body.citizen_access_hash;
        if (body.status === "withdrawn") status = "withdrawn";
        return undefined;
      }
      if (path === "fir_saathi_audit_events") return undefined;
      throw new Error(`Unexpected Supabase test request: ${path}`);
    });
  });

  it("returns one replacement capability and immediately revokes the old private code", async () => {
    const result = await rotateCitizenAccessCode(publicId);

    expect(result.citizenAccessCode).toMatch(/^FSC-[A-F0-9]{40}$/);
    expect(result.citizenAccessCode).not.toBe(originalCode);
    await expect(requireCitizenAccess(publicId, originalCode)).rejects.toThrow("invalid or unavailable");
    await expect(requireCitizenAccess(publicId, result.citizenAccessCode)).resolves.toMatchObject({ public_id: publicId });
    expect(supabaseRequestMock.mock.calls.some(([path, options]) => path === "fir_saathi_audit_events" && JSON.parse(String(options.body)).event_type === "access_code_rotated")).toBe(true);
  });

  it("marks the record withdrawn, clears its private capability, and blocks further access-code changes", async () => {
    const result = await withdrawComplaint(publicId);

    expect(result.withdrawnAt).toBeInstanceOf(Date);
    await expect(requireCitizenAccess(publicId, originalCode)).rejects.toThrow("withdrawn");
    await expect(rotateCitizenAccessCode(publicId)).rejects.toThrow("withdrawn");
    expect(supabaseRequestMock.mock.calls.some(([path, options]) => path === "fir_saathi_audit_events" && JSON.parse(String(options.body)).event_type === "withdrawn")).toBe(true);
  });
});
