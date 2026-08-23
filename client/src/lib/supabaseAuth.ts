type SupabaseSession = { access_token: string; refresh_token: string; expires_in: number };
type AuthResponse = { session: SupabaseSession | null; user?: { id: string; email?: string | null }; msg?: string };

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase sign-in is not configured for this browser.");
  return { url: url.replace(/\/$/, ""), key };
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  const { url, key } = getConfig();
  const response = await fetch(`${url}${path}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as AuthResponse & { error_description?: string; message?: string };
  if (!response.ok) throw new Error(payload.error_description || payload.message || "Supabase could not complete sign-in.");
  return payload;
}

export function signInWithSupabase(email: string, password: string) {
  return authRequest("/auth/v1/token?grant_type=password", { email, password });
}

export function signUpWithSupabase(email: string, password: string, displayName: string) {
  return authRequest("/auth/v1/signup", { email, password, data: { display_name: displayName } });
}
