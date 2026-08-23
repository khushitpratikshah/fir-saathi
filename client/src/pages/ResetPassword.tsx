import { useMemo, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, KeyRound } from "lucide-react";
import FirSaathiShell from "@/components/FirSaathiShell";
import { updatePasswordFromRecovery } from "@/lib/supabaseAuth";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const token = useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get("access_token"), []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); if (!token) { setError("This reset link is incomplete or expired. Request a new password-reset email."); return; } setSaving(true); try { await updatePasswordFromRecovery(token, password); setMessage("Your password has been updated. You can now sign in."); } catch (caught) { setError(caught instanceof Error ? caught.message : "Password update could not be completed."); } finally { setSaving(false); } };
  return <FirSaathiShell compact><main className="app-real-surface grid min-h-[calc(100vh-144px)] place-items-center px-5 py-10"><section className="w-full max-w-md rounded-2xl border border-[#102643]/10 bg-white p-7 text-center shadow-[0_18px_45px_rgba(12,32,57,.08)]"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fff0e8] text-[#c64e19]"><KeyRound className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-bold text-[#102643]">Set a new password</h1><p className="mt-2 text-sm leading-6 text-slate-600">Choose a new FIR Saathi account password. The reset link can be used only once.</p>{message ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mr-1 inline h-4 w-4" /> {message}<Link href="/officer" className="mt-3 block font-bold underline underline-offset-4">Return to sign-in</Link></div> : <form onSubmit={submit} className="mt-5 space-y-3 text-left"><input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring h-11 w-full rounded-xl border border-[#102643]/15 px-3 text-sm" placeholder="New password" autoComplete="new-password" /><button type="submit" disabled={saving} className="focus-ring w-full rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Updating password…" : "Save new password"}</button></form>}{error && <p className="mt-3 text-xs leading-5 text-[#9b3a0d]">{error}</p>}</section></main></FirSaathiShell>;
}
