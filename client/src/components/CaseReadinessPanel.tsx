import { CheckCircle2, CircleAlert, ClipboardCheck, FileAudio, MessageSquareText } from "lucide-react";

type Field = { fieldKey: string; source: string; verificationState: string };
type Audit = { eventType: string; createdAt: Date };
type Draft = { missingDetails: string[] };

export function getCaseReadiness(input: { fields: Field[]; audit: Audit[]; draft: Draft; evidenceCount: number; status: string }) {
  const hasContext = input.fields.some((field) => field.source === "citizen_context");
  const hasPlace = input.fields.some((field) => field.fieldKey === "context_incident_where" || field.fieldKey === "location");
  const hasWhen = input.fields.some((field) => field.fieldKey === "context_incident_when" || field.fieldKey === "date_time");
  const latestReturned = [...input.audit].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find((event) => event.eventType === "returned");
  const clarification = input.audit.find((event) => event.eventType === "clarification_added" && (!latestReturned || new Date(event.createdAt).getTime() >= new Date(latestReturned.createdAt).getTime()));
  return [
    { label: "Verbatim source statement", complete: true, detail: "Preserved separately from working fields." },
    { label: "Incident place", complete: hasPlace, detail: hasPlace ? "A place or landmark is available." : "Ask for an area, landmark, or route if relevant." },
    { label: "Incident time", complete: hasWhen, detail: hasWhen ? "A date, time, or approximation is available." : "Ask when it happened if relevant." },
    { label: "Citizen context", complete: hasContext, detail: hasContext ? "Optional citizen-provided details are available separately." : "No optional context was supplied." },
    { label: "Clarification loop", complete: input.status !== "returned" || Boolean(clarification), detail: input.status !== "returned" ? "No unanswered return request." : clarification ? "Citizen added a response after the return request." : "Await a citizen response to the documented request." },
    { label: "Evidence metadata", complete: input.evidenceCount > 0, detail: input.evidenceCount ? "Encrypted audio metadata is available." : "No audio metadata attached to this record." },
  ];
}

export default function CaseReadinessPanel({ fields, audit, draft, evidenceCount, status, dark = false }: { fields: Field[]; audit: Audit[]; draft: Draft; evidenceCount: number; status: string; dark?: boolean }) {
  const checks = getCaseReadiness({ fields, audit, draft, evidenceCount, status });
  const completeCount = checks.filter((check) => check.complete).length;
  const unresolvedGaps = draft.missingDetails.length;
  return <section className={`rounded-2xl border p-5 shadow-[0_14px_35px_rgba(12,32,57,.05)] ${dark ? "border-white/10 bg-white/[0.055] text-slate-100" : "border-[#102643]/10 bg-white text-[#102643]"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#f48a51]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Review readiness</p><p className="mt-1 text-sm font-bold">Factual areas to check before a human decision.</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${completeCount >= 5 && unresolvedGaps === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{completeCount}/{checks.length} signals present</span></div><ul className="mt-5 grid gap-2 sm:grid-cols-2">{checks.map((check) => <li key={check.label} className={`rounded-xl border p-3 ${dark ? "border-white/10 bg-black/15" : "border-[#102643]/8 bg-[#fbfaf6]"}`}><div className="flex gap-2"><span className={`mt-0.5 ${check.complete ? "text-emerald-600" : "text-amber-600"}`}>{check.complete ? <CheckCircle2 className="h-4 w-4" /> : check.label === "Evidence metadata" ? <FileAudio className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</span><div><p className="text-xs font-bold">{check.label}</p><p className={`mt-1 text-[11px] leading-5 ${dark ? "text-slate-400" : "text-slate-600"}`}>{check.detail}</p></div></div></li>)}</ul>{unresolvedGaps > 0 && <p className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${dark ? "bg-amber-400/10 text-amber-100" : "bg-amber-50 text-amber-900"}`}><MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />The assistant identified {unresolvedGaps} follow-up area{unresolvedGaps === 1 ? "" : "s"}. They are prompts for review, not missing facts.</p>}</section>;
}
