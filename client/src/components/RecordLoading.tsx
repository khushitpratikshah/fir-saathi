import { Loader2, ShieldCheck } from "lucide-react";

export default function RecordLoading({ label = "Opening the protected prototype record" }: { label?: string }) {
  return <main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><section className="w-full max-w-sm rounded-2xl border border-[#102643]/10 bg-white/90 p-6 text-center shadow-[0_18px_45px_rgba(12,32,57,.09)]"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fff1e9] text-[#c64e19]"><Loader2 className="h-5 w-5 animate-spin" /></span><h1 className="mt-4 text-lg font-bold tracking-[-0.02em] text-[#102643]">{label}</h1><p className="mt-2 text-sm leading-6 text-slate-600">FIR Saathi keeps the source statement separate while the review workspace loads.</p><p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#15803d]"><ShieldCheck className="h-3.5 w-3.5" /> Human verification remains required</p></section></main>;
}
