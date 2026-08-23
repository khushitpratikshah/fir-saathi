import { describe, expect, it } from "vitest";
import { normaliseSupabaseAuthPayload } from "./supabaseAuth";

describe("Supabase Auth REST response normalization", () => {
  it("normalizes password-grant tokens returned at the top level into a session", () => {
    expect(normaliseSupabaseAuthPayload({
      session: null,
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      user: { id: "user-id", email: "citizen@example.com" },
    })).toMatchObject({
      session: { access_token: "access-token", refresh_token: "refresh-token", expires_in: 3600 },
    });
  });

  it("preserves a null session for an unconfirmed sign-up response", () => {
    expect(normaliseSupabaseAuthPayload({ session: null, user: { id: "user-id" } }).session).toBeNull();
  });
});
