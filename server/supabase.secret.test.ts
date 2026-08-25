import { describe, expect, it } from "vitest";

const describeLive = process.env.RUN_LIVE_PROVIDER_TESTS === "1" ? describe : describe.skip;

describeLive("Supabase service-role configuration", () => {
  it("can reach the protected FIR Saathi complaints endpoint", async () => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(url).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/fir_saathi_complaints?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
