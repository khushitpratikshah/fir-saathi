import { useEffect, useState } from "react";
import { ArrowRight, FileKey2, Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import FirSaathiShell from "@/components/FirSaathiShell";
import { trpc } from "@/lib/trpc";

export default function ResumeIntake() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const resume = trpc.complaints.resumeIntakeDraft.useQuery({ resumeCode: submittedCode }, { enabled: submittedCode.length >= 12, retry: false });

  useEffect(() => {
    if (!resume.data || !submittedCode) return;
    window.sessionStorage.setItem("fir-saathi-resume-code", submittedCode);
    navigate("/intake");
  }, [navigate, resume.data, submittedCode]);

  return <FirSaathiShell compact><main className="page-grid grid min-h-[calc(100vh-144px)] place-items-center px-5 py-10"><section className="w-full max-w-lg rounded-[1.4rem] border border-[#102643]/10 bg-[#fbfaf6]/95 p-6 shadow-[0_22px_55px_rgba(12,32,57,.09)] sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1e9] text-[#c64e19]"><FileKey2 className="h-5 w-5" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Resume saved intake</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#102643]">Continue where you stopped.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Enter the private resume code shown when you saved. It is not an official complaint number and should not be shared.</p><form className="mt-6" onSubmit={(event) => { event.preventDefault(); setSubmittedCode(code.trim()); }}><label htmlFor="resume-code" className="text-sm font-bold text-[#102643]">Private resume code</label><input id="resume-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" spellCheck={false} placeholder="FSR-…" className="focus-ring mt-2 h-12 w-full rounded-xl border border-[#102643]/14 bg-white px-3 font-mono text-sm tracking-wide text-[#102643] placeholder:font-sans placeholder:tracking-normal" /><button type="submit" disabled={code.trim().length < 12 || resume.isFetching} className="pressable focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white disabled:opacity-50">{resume.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Continue saved intake</button></form>{resume.error && <p role="alert" className="mt-4 rounded-xl border border-[#c64e19]/20 bg-[#fff5ef] p-3 text-xs leading-5 text-[#8f360e]">This saved intake is unavailable. Check the code or begin a new intake.</p>}<p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803d]" />The code restores only a saved intake draft. It does not submit a complaint or register an FIR.</p></section></main></FirSaathiShell>;
}
