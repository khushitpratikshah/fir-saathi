import type { Response } from "express";

export const SUPABASE_ACCESS_COOKIE = "fir_saathi_access_token";
export const SUPABASE_REFRESH_COOKIE = "fir_saathi_refresh_token";

export type PortableUser = {
  id: string;
  name: string | null;
  email: string | null;
  loginMethod: "supabase";
  role: "citizen" | "constable" | "admin";
};

type AuthIdentity = { id: string; email?: string | null; user_metadata?: { display_name?: string | null; full_name?: string | null } };
type AuthSession = { accessToken: string; refreshToken: string; expiresIn: number };

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase authentication is not configured on the server.");
  return { url: url.replace(/\/$/, ""), key };
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
}

async function requestSupabase<T>(path: string, init: RequestInit) {
  const { url, key } = config();
  const response = await fetch(`${url}${path}`, { ...init, headers: { apikey: key, ...(init.headers ?? {}) } });
  if (!response.ok) return null;
  return await response.json() as T;
}

export async function getPortableUser(accessToken: string | undefined): Promise<PortableUser | null> {
  if (!accessToken) return null;
  const identity = await requestSupabase<AuthIdentity>("/auth/v1/user", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!identity?.id) return null;
  const { url } = config();
  const profile = await requestSupabase<Array<{ role: "citizen" | "constable" | "administrator"; display_name: string | null }>>(`/rest/v1/fir_saathi_profiles?id=eq.${encodeURIComponent(identity.id)}&select=role,display_name`, { headers: { Authorization: `Bearer ${config().key}` } });
  const current = profile?.[0];
  if (!current) return null;
  const suppliedName = identity.user_metadata?.display_name || identity.user_metadata?.full_name || null;
  const bootstrapEmail = process.env.FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const isBootstrapAdministrator = Boolean(bootstrapEmail && identity.email?.toLowerCase() === bootstrapEmail);
  return { id: identity.id, email: identity.email ?? null, name: current.display_name || suppliedName, loginMethod: "supabase", role: isBootstrapAdministrator || current.role === "administrator" ? "admin" : current.role === "constable" ? "constable" : "citizen" };
}

export function storePortableSession(res: Response, session: AuthSession) {
  const options = cookieOptions();
  res.cookie(SUPABASE_ACCESS_COOKIE, session.accessToken, { ...options, maxAge: Math.max(60, Math.min(session.expiresIn, 60 * 60 * 24 * 7)) * 1000 });
  res.cookie(SUPABASE_REFRESH_COOKIE, session.refreshToken, options);
}

export function clearPortableSession(res: Response) {
  const options = cookieOptions();
  res.clearCookie(SUPABASE_ACCESS_COOKIE, { ...options, maxAge: -1 });
  res.clearCookie(SUPABASE_REFRESH_COOKIE, { ...options, maxAge: -1 });
}
