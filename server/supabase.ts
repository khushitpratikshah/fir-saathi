type SupabaseRequestOptions = RequestInit & { prefer?: string };

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase is not configured for the FIR Saathi server.");
  return { url, serviceRoleKey };
}

export async function supabaseRequest<T>(path: string, options: SupabaseRequestOptions = {}): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const headers = new Headers(options.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("Authorization", `Bearer ${serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  if (options.prefer) headers.set("Prefer", options.prefer);

  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 400)}`);
  }
  if (response.status === 204) return undefined as T;
  const responseText = await response.text();
  if (!responseText.trim()) return undefined as T;
  return JSON.parse(responseText) as T;
}
