import { describe, expect, it } from "vitest";

describe("bootstrap administrator configuration", () => {
  it("has a valid administrator email and a reachable Supabase Auth service", async () => {
    const email = process.env.FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL;
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key! } });
    expect(response.ok).toBe(true);
  }, 15_000);
});
