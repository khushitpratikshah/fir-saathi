import type { FormEvent, PropsWithChildren } from "react";
import { useState } from "react";
import { BadgeCheck, Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { requestPasswordRecovery, signInWithSupabase, signUpWithSupabase } from "@/lib/supabaseAuth";
import { trpc } from "@/lib/trpc";

export function useOfficerAccess() {
  const auth = useAuth();
  return { ...auth, isOfficer: auth.user?.role === "admin" || auth.user?.role === "constable" };
}

export default function OfficerAccessGate({ children }: PropsWithChildren) {
  const { user, loading, isOfficer } = useOfficerAccess();
  if (loading) return <main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#c64e19]" /><p className="mt-3 text-xs font-bold text-slate-500">Checking workspace access</p></div></main>;
  if (!user) return <PortableSignIn />;
  if (!isOfficer) return <main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><section className="max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-7 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-800"><ShieldAlert className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-bold text-[#102643]">Constable access is not assigned</h1><p className="mt-2 text-sm leading-6 text-slate-600">You are signed in as a citizen account. An administrator must assign the constable role before you can inspect or verify records.</p><p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800"><BadgeCheck className="h-3.5 w-3.5" /> Citizen intake remains available.</p></section></main>;
  return <>{children}</>;
}

function PortableSignIn() {
  const utils = trpc.useUtils();
  const establish = trpc.auth.establishSession.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); } });
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const recover = async () => { setError(""); setNotice(""); if (!email.trim()) { setError("Enter your email address first, then request a reset link."); return; } try { await requestPasswordRecovery(email.trim()); setNotice("If the account exists, Supabase has sent a password-reset email."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Password recovery could not be started."); } };
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setNotice(""); try { const result = mode === "sign-in" ? await signInWithSupabase(email.trim(), password) : await signUpWithSupabase(email.trim(), password, name.trim()); if (!result.session) { setNotice("Check your inbox to confirm the account, then sign in with your email and password."); return; } await establish.mutateAsync({ accessToken: result.session.access_token, refreshToken: result.session.refresh_token, expiresIn: result.session.expires_in }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in could not be completed."); } };
  return <main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><section className="max-w-md rounded-2xl border border-[#102643]/10 bg-white p-7 text-center shadow-[0_18px_45px_rgba(12,32,57,.09)]"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fff0e8] text-[#c64e19]"><LockKeyhole className="h-5 w-5" /></span><h1 className="mt-4 text-xl font-bold text-[#102643]">Constable sign-in required</h1><p className="mt-2 text-sm leading-6 text-slate-600">Use your FIR Saathi account to open the review queue. Constable access is assigned by an administrator and enforced by the server.</p><form onSubmit={submit} className="mt-5 space-y-3 text-left">{mode === "sign-up" && <input required value={name} onChange={(event) => setName(event.target.value)} className="focus-ring h-11 w-full rounded-xl border border-[#102643]/15 px-3 text-sm" placeholder="Display name" autoComplete="name" />}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring h-11 w-full rounded-xl border border-[#102643]/15 px-3 text-sm" placeholder="Email address" autoComplete="email" /><input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring h-11 w-full rounded-xl border border-[#102643]/15 px-3 text-sm" placeholder="Password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /><button type="submit" disabled={establish.isPending} className="focus-ring w-full rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{establish.isPending ? "Verifying session…" : mode === "sign-in" ? "Sign in to review records" : "Create FIR Saathi account"}</button></form><div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">{mode === "sign-in" && <button type="button" onClick={() => void recover()} className="focus-ring text-xs font-bold text-slate-600 underline underline-offset-4">Forgot password?</button>}<button type="button" onClick={() => { setMode((current) => current === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }} className="focus-ring text-xs font-bold text-[#102643] underline underline-offset-4">{mode === "sign-in" ? "Need an account? Sign up" : "Already registered? Sign in"}</button></div>{notice && <p className="mt-3 text-xs leading-5 text-emerald-800">{notice}</p>}{error && <p className="mt-3 text-xs leading-5 text-[#9b3a0d]">{error}</p>}</section></main>;
}
