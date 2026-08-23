import { describe, expect, it } from "vitest";

describe("Supabase browser-auth configuration", () => {
  it("accepts the configured public endpoint and publishable key", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_/);

    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key! } });
    expect(response.ok).toBe(true);
  }, 15_000);
});
