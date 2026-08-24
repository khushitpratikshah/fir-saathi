import { useEffect, useState } from "react";
import { ArrowRight, FileKey2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import FirSaathiShell from "@/components/FirSaathiShell";
import { isPrototypeRecordReference, normalizeCitizenRecoveryInput } from "@/lib/citizenRecovery";
import { trpc } from "@/lib/trpc";

export default function ResumeIntake() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");
  const resume = trpc.complaints.resumeIntakeDraft.useQuery({ resumeCode: submittedCode }, { enabled: submittedCode.length >= 12, retry: false });
  const record = trpc.complaints.get.useQuery({ publicId: submittedReference }, { enabled: Boolean(submittedReference), retry: false });
  const normalizedCode = normalizeCitizenRecoveryInput(code);
  const isReference = isPrototypeRecordReference(normalizedCode);
  const acceptsCode = normalizedCode.length >= 12 || isReference;
  useEffect(() => {
    if (!resume.data || !submittedCode) return;
    window.sessionStorage.setItem("fir-saathi-resume-code", submittedCode);
    navigate("/intake");
  }, [navigate, resume.data, submittedCode]);
  useEffect(() => {
    if (record.data && submittedReference) navigate(`/status/${submittedReference}`);
  }, [navigate, record.data, submittedReference]);
  const isLoading = resume.isFetching || record.isFetching;
  return <FirSaathiShell compact><main className="page-grid grid min-h-[calc(100vh-144px)] place-items-center px-5 py-10"><section className="w-full max-w-lg rounded-[1.4rem] border border-[#102643]/10 bg-[#fbfaf6]/95 p-6 shadow-[0_22px_55px_rgba(12,32,57,.09)] sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1e9] text-[#c64e19]"><FileKey2 className="h-5 w-5" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Resume or open a record</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#102643]">Continue where you stopped.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Use the code you have. FIR Saathi checks a short record reference before opening it, so a mistyped or unavailable code never sends you to an empty status page.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><aside className="rounded-xl border border-[#102643]/10 bg-white p-3"><div className="flex items-center gap-2"><FileKey2 className="h-4 w-4 text-[#c64e19]" /><p className="text-xs font-bold text-[#102643]">Private saved-intake code</p></div><p className="mt-2 text-xs leading-5 text-slate-600"><code>FSR-…</code> restores an unsubmitted intake saved by you. Keep it private.</p></aside><aside className="rounded-xl border border-[#102643]/10 bg-[#f5f2eb] p-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#c64e19]" /><p className="text-xs font-bold text-[#102643]">Prototype record reference</p></div><p className="mt-2 text-xs leading-5 text-slate-600"><code>FS-…</code> opens an existing prototype record only after it is found on this server. It is not an FIR number.</p></aside></div><form className="mt-6" onSubmit={(event) => { event.preventDefault(); if (isReference) { setSubmittedReference(normalizedCode); return; } setSubmittedCode(normalizedCode); }}><label htmlFor="resume-code" className="text-sm font-bold text-[#102643]">Saved-intake code or record reference</label><input id="resume-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" spellCheck={false} placeholder="FSR-… or FS-…" className="focus-ring mt-2 h-12 w-full rounded-xl border border-[#102643]/14 bg-white px-3 font-mono text-sm tracking-wide text-[#102643] placeholder:font-sans placeholder:tracking-normal" /><p className="mt-2 text-xs text-slate-500">{isReference ? "We will check this prototype record reference before opening it." : "A private saved-intake code will restore your unfinished intake."}</p><button type="submit" disabled={!acceptsCode || isLoading} className="pressable focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{isReference ? "Check prototype record" : "Continue saved intake"}</button></form>{resume.error && <p role="alert" className="mt-4 rounded-xl border border-[#c64e19]/20 bg-[#fff5ef] p-3 text-xs leading-5 text-[#8f360e]">This saved intake is unavailable. Check the private <code>FSR-…</code> code or begin a new intake.</p>}{record.error && <p role="alert" className="mt-4 rounded-xl border border-[#c64e19]/20 bg-[#fff5ef] p-3 text-xs leading-5 text-[#8f360e]">This <code>FS-…</code> reference does not match an available prototype record on this server. It cannot restore an unfinished intake; use the private <code>FSR-…</code> code for that.</p>}<p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803d]" />Neither code registers an FIR or creates an emergency-service receipt.</p></section></main></FirSaathiShell>;
}
