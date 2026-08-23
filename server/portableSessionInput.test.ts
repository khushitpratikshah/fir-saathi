import { describe, expect, it } from "vitest";
import { portableSessionInputSchema } from "./routers";

describe("portable session input", () => {
  it("accepts a short opaque Supabase refresh token after access-token verification", () => {
    expect(portableSessionInputSchema.parse({
      accessToken: "a".repeat(20),
      refreshToken: "opaque-refresh",
      expiresIn: 3600,
    })).toMatchObject({ refreshToken: "opaque-refresh" });
  });

  it("still rejects an empty refresh token", () => {
    expect(() => portableSessionInputSchema.parse({
      accessToken: "a".repeat(20),
      refreshToken: "",
      expiresIn: 3600,
    })).toThrow();
  });
});
