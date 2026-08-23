type SupabaseSession = { access_token: string; refresh_token: string; expires_in: number };
type AuthResponse = { session: SupabaseSession | null; user?: { id: string; email?: string | null }; msg?: string };
type SupabaseAuthPayload = AuthResponse & Partial<SupabaseSession> & { error_description?: string; message?: string };

export function normaliseSupabaseAuthPayload(payload: SupabaseAuthPayload): AuthResponse {
  const embeddedSession = payload.session;
  if (embeddedSession) return payload;
  if (typeof payload.access_token === "string" && typeof payload.refresh_token === "string" && typeof payload.expires_in === "number") {
    return { ...payload, session: { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_in: payload.expires_in } };
  }
  return { ...payload, session: null };
}

function getConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase sign-in is not configured for this browser.");
  return { url: url.replace(/\/$/, ""), key };
}

async function authRequest(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  const { url, key } = getConfig();
  const response = await fetch(`${url}${path}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as SupabaseAuthPayload;
  if (!response.ok) throw new Error(payload.error_description || payload.message || "Supabase could not complete sign-in.");
  return normaliseSupabaseAuthPayload(payload);
}

export function signInWithSupabase(email: string, password: string) {
  return authRequest("/auth/v1/token?grant_type=password", { email, password });
}

export function signUpWithSupabase(email: string, password: string, displayName: string) {
  return authRequest("/auth/v1/signup", { email, password, data: { display_name: displayName } });
}

export async function requestPasswordRecovery(email: string) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/auth/v1/recover`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, redirect_to: `${window.location.origin}/reset-password` }) });
  if (!response.ok) throw new Error("Supabase could not send the password reset email.");
}

export async function updatePasswordFromRecovery(accessToken: string, password: string) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) throw new Error("The password-reset link is invalid or has expired. Request a new one.");
}
