import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, Clock3, Copy, FileText, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import CitizenJourneyProgress from "@/components/CitizenJourneyProgress";
import ComplaintStatusPill from "@/components/ComplaintStatusPill";
import FirSaathiShell from "@/components/FirSaathiShell";
import RecordLoading from "@/components/RecordLoading";
import { trpc } from "@/lib/trpc";

const messageByStatus = {
  draft: { title: "Your draft is still being prepared.", detail: "Return to your intake to continue. It has not been sent for review.", icon: Clock3 },
  needs_citizen_confirmation: { title: "Review your words before sending.", detail: "Your source statement is ready for your explicit confirmation.", icon: FileText },
  ready_for_review: { title: "Your details are ready for human review.", detail: "A constable can review this prototype record. This does not register an FIR.", icon: Clock3 },
  returned: { title: "A constable asked for one more detail.", detail: "Open your record to read the request and add a clarification in your own words.", icon: CircleAlert },
  verified: { title: "The prototype review is complete.", detail: "A constable verified this prototype record. No FIR was registered by this application.", icon: CheckCircle2 },
} as const;

export default function CitizenStatus() {
  const [, params] = useRoute("/status/:publicId");
  const publicId = params?.publicId ?? "";
  const detail = trpc.complaints.get.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const [copied, setCopied] = useState(false);
  if (detail.isLoading) return <FirSaathiShell><RecordLoading label="Opening your review status" /></FirSaathiShell>;
  if (!detail.data) return <FirSaathiShell><main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="max-w-md text-center"><CircleAlert className="mx-auto h-8 w-8 text-[#c64e19]" /><h1 className="mt-4 text-3xl font-bold tracking-[-0.04em]">This status is unavailable.</h1><p className="mt-2 text-sm leading-6 text-slate-600">The prototype record could not be found or opened.</p><Link href="/intake" className="focus-ring mt-6 inline-flex rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white">Begin a new intake</Link></div></main></FirSaathiShell>;
  const { complaint } = detail.data;
  const message = messageByStatus[complaint.status];
  const Icon = message.icon;
  const nextHref = complaint.status === "returned" || complaint.status === "needs_citizen_confirmation" ? `/confirm/${complaint.publicId}` : "/";
  const nextLabel = complaint.status === "returned" ? "Add clarification" : complaint.status === "needs_citizen_confirmation" ? "Review your words" : "Return to main page";
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(complaint.publicId);
      setCopied(true);
      toast.success("Prototype record reference copied.");
    } catch {
      toast.message(`Copy ${complaint.publicId} manually if this browser blocks clipboard access.`);
    }
  };
  return <FirSaathiShell compact><main className="page-grid min-h-[calc(100vh-144px)] py-8 sm:py-12"><div className="mx-auto max-w-3xl px-5 sm:px-8"><CitizenJourneyProgress stage="status" /><section className="mt-5 rounded-[1.4rem] border border-[#102643]/10 bg-[#fbfaf6]/95 p-6 shadow-[0_22px_55px_rgba(12,32,57,.09)] sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1e9] text-[#c64e19]"><Icon className="h-6 w-6" /></span><ComplaintStatusPill status={complaint.status} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Your prototype reference</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#102643]">{message.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{message.detail}</p><div className="mt-6 rounded-2xl border border-[#102643]/10 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Record reference</p><p className="mt-1 font-mono text-lg font-bold tracking-wide text-[#102643]">{complaint.publicId}</p></div><button type="button" onClick={copyReference} className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#102643]/12 px-3 text-xs font-bold text-[#102643] hover:bg-[#f5f2eb]" aria-label="Copy prototype record reference">{copied ? <ClipboardCheck className="h-3.5 w-3.5 text-[#15803d]" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button></div><p className="mt-3 text-xs leading-5 text-slate-500">Use this short <code>FS-…</code> reference to reopen this prototype record from the recovery page. It is not an FIR number or emergency-service receipt.</p></div><aside className="mt-5 flex gap-3 rounded-2xl border border-[#c64e19]/20 bg-[#fff5ef] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c64e19]" /><p className="text-xs leading-5 text-[#8f360e]">Your original statement remains separate from AI assistance and optional context. A constable makes every verification decision.</p></aside><Link href={nextHref} className="pressable focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white">{nextLabel}<ArrowRight className="h-4 w-4" /></Link></section></div></main></FirSaathiShell>;
}
