import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, Clock3, Copy, FileKey2, FileText, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import CitizenJourneyProgress from "@/components/CitizenJourneyProgress";
import ComplaintStatusPill from "@/components/ComplaintStatusPill";
import FirSaathiShell from "@/components/FirSaathiShell";
import RecordLoading from "@/components/RecordLoading";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { clearCitizenAccess, getCitizenAccess, rememberCitizenAccess } from "@/lib/citizenRecordAccess";
import { trpc } from "@/lib/trpc";
import type { ComplaintStatus } from "../../../shared/firSaathi";

const messageByStatus: Record<ComplaintStatus, { title: string; detail: string; icon: typeof Clock3 }> = {
  draft: { title: "Your draft is still being prepared.", detail: "Return to your intake to continue. It has not been sent for review.", icon: Clock3 },
  needs_citizen_confirmation: { title: "Review your words before sending.", detail: "Your source statement is ready for your explicit confirmation.", icon: FileText },
  ready_for_review: { title: "Your details are ready for human review.", detail: "A constable can review this prototype record. This does not register an FIR.", icon: Clock3 },
  returned: { title: "A constable asked for one more detail.", detail: "Open your record to read the request and add a clarification in your own words.", icon: CircleAlert },
  verified: { title: "The prototype review is complete.", detail: "A constable verified this prototype record. No FIR was registered by this application.", icon: CheckCircle2 },
  withdrawn: { title: "This prototype record was withdrawn.", detail: "Its active workspace access has been revoked. This application does not withdraw a real FIR or certify deletion from every external backup or legal system.", icon: CircleAlert },
};

export default function CitizenStatus() {
  const [, params] = useRoute("/status/:publicId");
  const publicId = params?.publicId ?? "";
  const [citizenAccessCode, setCitizenAccessCode] = useState(() => getCitizenAccess(publicId));
  const [withdrawnNotice, setWithdrawnNotice] = useState(false);
  const detail = trpc.complaints.get.useQuery({ publicId, citizenAccessCode }, { enabled: Boolean(publicId && citizenAccessCode) });
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState<"reference" | "access" | null>(null);
  const rotateAccessCode = trpc.complaints.rotateCitizenAccessCode.useMutation({
    onSuccess: async ({ citizenAccessCode: replacement }) => {
      rememberCitizenAccess(publicId, replacement);
      setCitizenAccessCode(replacement);
      await utils.complaints.get.invalidate();
      toast.success("Private access code replaced. The previous code no longer works.");
    },
    onError: (error) => toast.error(error.message),
  });
  const withdraw = trpc.complaints.withdraw.useMutation({
    onSuccess: () => {
      clearCitizenAccess(publicId);
      setCitizenAccessCode("");
      setWithdrawnNotice(true);
      toast.success("The active prototype record was withdrawn and its private access code was revoked.");
    },
    onError: (error) => toast.error(error.message),
  });

  const copyValue = async (value: string, kind: "reference" | "access") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "access" ? "Private access code copied. Store it separately." : "Prototype record reference copied.");
    } catch {
      toast.message(`Copy ${value} manually if this browser blocks clipboard access.`);
    }
  };

  if (withdrawnNotice) return <FirSaathiShell><main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="max-w-lg rounded-[1.4rem] border border-rose-200 bg-[#fffaf8] p-7 text-center shadow-[0_22px_55px_rgba(12,32,57,.09)]"><CircleAlert className="mx-auto h-9 w-9 text-rose-700" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-rose-800">Prototype record withdrawn</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[#102643]">Active access has been revoked.</h1><p className="mt-3 text-sm leading-6 text-slate-600">This removes the record from normal citizen and constable workspaces and invalidates its private access code. It does not withdraw a real FIR, contact emergency services, or certify deletion from every backup or legal retention system.</p><Link href="/" className="focus-ring mt-6 inline-flex rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white">Return to main page</Link></div></main></FirSaathiShell>;
  if (detail.isLoading) return <FirSaathiShell><RecordLoading label="Opening your review status" /></FirSaathiShell>;
  if (!detail.data) return <FirSaathiShell><main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="max-w-md text-center"><CircleAlert className="mx-auto h-8 w-8 text-[#c64e19]" /><h1 className="mt-4 text-3xl font-bold tracking-[-0.04em]">This status is unavailable.</h1><p className="mt-2 text-sm leading-6 text-slate-600">This browser does not have the private access code required to open the record.</p><Link href="/resume" className="focus-ring mt-6 inline-flex rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white">Open with private codes</Link></div></main></FirSaathiShell>;

  const { complaint } = detail.data;
  const message = messageByStatus[complaint.status];
  const Icon = message.icon;
  const nextHref = complaint.status === "returned" || complaint.status === "needs_citizen_confirmation" ? `/confirm/${complaint.publicId}` : "/";
  const nextLabel = complaint.status === "returned" ? "Add clarification" : complaint.status === "needs_citizen_confirmation" ? "Review your words" : "Return to main page";

  return <FirSaathiShell compact><main className="page-grid min-h-[calc(100vh-144px)] py-8 sm:py-12"><div className="mx-auto max-w-3xl px-5 sm:px-8"><CitizenJourneyProgress stage="status" /><section className="mt-5 rounded-[1.4rem] border border-[#102643]/10 bg-[#fbfaf6]/95 p-6 shadow-[0_22px_55px_rgba(12,32,57,.09)] sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1e9] text-[#c64e19]"><Icon className="h-6 w-6" /></span><ComplaintStatusPill status={complaint.status} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Your prototype record</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#102643]">{message.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{message.detail}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-[#102643]/10 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Record reference</p><p className="mt-1 font-mono text-base font-bold tracking-wide text-[#102643]">{complaint.publicId}</p></div><button type="button" onClick={() => void copyValue(complaint.publicId, "reference")} className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#102643]/12 px-3 text-xs font-bold text-[#102643] hover:bg-[#f5f2eb]">{copied === "reference" ? <ClipboardCheck className="h-3.5 w-3.5 text-[#15803d]" /> : <Copy className="h-3.5 w-3.5" />}{copied === "reference" ? "Copied" : "Copy"}</button></div><p className="mt-3 text-xs leading-5 text-slate-500">This short <code>FS-…</code> value identifies the record. It does not grant access on its own.</p></section><section className="rounded-2xl border border-[#c64e19]/20 bg-[#fff5ef] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f360e]">Private access code</p><p className="mt-1 break-all font-mono text-sm font-bold tracking-wide text-[#102643]">{citizenAccessCode}</p></div><button type="button" onClick={() => void copyValue(citizenAccessCode, "access")} className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#c64e19]/20 bg-white px-3 text-xs font-bold text-[#8f360e]">{copied === "access" ? <ClipboardCheck className="h-3.5 w-3.5 text-[#15803d]" /> : <Copy className="h-3.5 w-3.5" />}{copied === "access" ? "Copied" : "Copy"}</button></div><p className="mt-3 text-xs leading-5 text-[#8f360e]">Keep this <code>FSC-…</code> code private. You need both codes to reopen this record on another device.</p></section></div><section className="mt-5 rounded-2xl border border-[#102643]/10 bg-white p-4"><div className="flex gap-3"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#102643]" /><div><p className="text-sm font-bold text-[#102643]">Manage private access</p><p className="mt-1 text-xs leading-5 text-slate-600">Replace the private code if you believe this device or code was exposed. The old code stops working immediately.</p><AlertDialog><AlertDialogTrigger asChild><button type="button" className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#102643]/15 px-3 text-xs font-bold text-[#102643] hover:bg-[#f5f2eb]"><KeyRound className="h-3.5 w-3.5" />Replace private code</button></AlertDialogTrigger><AlertDialogContent className="border-[#102643]/15 bg-[#fbfaf6] text-[#102643]"><AlertDialogHeader><AlertDialogTitle>Replace this private access code?</AlertDialogTitle><AlertDialogDescription>The current <code>FSC-…</code> code will stop working immediately. Save the replacement code before closing this page.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep current code</AlertDialogCancel><AlertDialogAction onClick={() => rotateAccessCode.mutate({ publicId, citizenAccessCode })} disabled={rotateAccessCode.isPending} className="bg-[#102643] text-white hover:bg-[#18385e]">{rotateAccessCode.isPending ? "Replacing…" : "Replace code"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></section><section className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4"><div className="flex gap-3"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" /><div><p className="text-sm font-bold text-rose-900">Withdraw this prototype record</p><p className="mt-1 text-xs leading-5 text-rose-900/80">This revokes its active access and removes its content from normal workspaces. It does not withdraw a real FIR or prove deletion from every external backup or legal system.</p><AlertDialog><AlertDialogTrigger asChild><button type="button" className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-xs font-bold text-rose-800 hover:bg-rose-100"><TriangleAlert className="h-3.5 w-3.5" />Withdraw prototype record</button></AlertDialogTrigger><AlertDialogContent className="border-rose-200 bg-[#fffaf8] text-[#102643]"><AlertDialogHeader><AlertDialogTitle>Withdraw active prototype access?</AlertDialogTitle><AlertDialogDescription>This cannot be undone through this citizen flow. The application will revoke the private code and remove the complaint content from normal citizen and constable workspaces. It does not affect a real FIR or emergency service.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep active record</AlertDialogCancel><AlertDialogAction onClick={() => withdraw.mutate({ publicId, citizenAccessCode })} disabled={withdraw.isPending} className="bg-rose-700 text-white hover:bg-rose-800">{withdraw.isPending ? "Withdrawing…" : "Withdraw record"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></section><aside className="mt-5 flex gap-3 rounded-2xl border border-[#c64e19]/20 bg-[#fff5ef] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c64e19]" /><p className="text-xs leading-5 text-[#8f360e]">Your original statement remains separate from AI assistance and optional context. A constable makes every verification decision.</p></aside><Link href={nextHref} className="pressable focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white">{nextLabel}<ArrowRight className="h-4 w-4" /></Link></section></div></main></FirSaathiShell>;
}
