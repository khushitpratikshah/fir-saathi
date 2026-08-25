import { CheckCircle2, CircleDotDashed, Clock3, FilePenLine, Fingerprint, KeyRound, LockKeyhole, MessageSquareText, SendHorizonal, ShieldCheck, TriangleAlert, Undo2 } from "lucide-react";

export type TimelineAuditEvent = { eventType: string; createdAt: Date; actorLabel: string };
type Props = { status: string; audit: TimelineAuditEvent[] };

const stages = [
  { eventType: "created", label: "Intake created", icon: FilePenLine, detail: "Citizen source record opened" },
  { eventType: "transcribed", label: "Transcript captured", icon: MessageSquareText, detail: "Source transcript and timecodes prepared" },
  { eventType: "evidence_checked", label: "Evidence fingerprint checked", icon: Fingerprint, detail: "Encrypted evidence integrity checkpoint recorded" },
  { eventType: "drafted", label: "Draft prepared", icon: CircleDotDashed, detail: "Source-backed working fields created" },
  { eventType: "citizen_confirmed", label: "Citizen confirmed", icon: SendHorizonal, detail: "Record sent to constable review" },
  { eventType: "verified", label: "Human verified", icon: ShieldCheck, detail: "Constable verification completed" },
];

const conditionalStages = [
  { eventType: "access_code_rotated", label: "Private code rotated", icon: KeyRound, detail: "Previous private access was revoked" },
  { eventType: "withdrawn", label: "Prototype record withdrawn", icon: TriangleAlert, detail: "Active workspace access was revoked" },
];

export function buildCaseTimeline(status: string, audit: TimelineAuditEvent[]) {
  const ascending = [...audit].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latestByType = (eventType: string) => [...ascending].reverse().find((event) => event.eventType === eventType);
  const returned = latestByType("returned");
  const clarification = latestByType("clarification_added");
  const displayStages = returned ? [...stages.slice(0, 5), { eventType: "returned", label: "Clarification requested", icon: Undo2, detail: "Returned with a documented reason" }, { eventType: "clarification_added", label: "Citizen clarified", icon: MessageSquareText, detail: "Response added separately from the source statement" }, ...stages.slice(5)] : stages;
  const observedConditionalStages = conditionalStages.filter((stage) => latestByType(stage.eventType));
  return { status, returned, clarification, stages: [...displayStages, ...observedConditionalStages].map((stage) => ({ ...stage, event: latestByType(stage.eventType) })) };
}

export default function CaseStatusTimeline({ status, audit }: Props) {
  const timeline = buildCaseTimeline(status, audit);
  const integrityEvents = [...audit].filter((event) => ["created", "transcribed", "evidence_checked", "citizen_confirmed", "field_corrected", "verified", "access_code_rotated", "withdrawn"].includes(event.eventType)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return <section className="rounded-2xl border border-[#102643]/10 bg-white p-5 shadow-[0_14px_35px_rgba(12,32,57,.05)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Evidence-integrity timeline</p><p className="mt-1 text-sm font-bold text-[#102643]">Trace the record from citizen capture to human decision.</p></div><span className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-600">{timeline.status.replaceAll("_", " ")}</span></div><ol className="mt-5 grid gap-3 sm:grid-cols-2">{timeline.stages.map((stage) => { const { event } = stage; const Icon = stage.icon; return <li key={stage.eventType} className={`rounded-xl border p-3 ${event ? "border-[#15803d]/25 bg-emerald-50" : "border-[#102643]/8 bg-[#fbfaf6]"}`}><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full ${event ? "bg-[#15803d] text-white" : "bg-slate-200 text-slate-500"}`}>{event ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><p className="text-xs font-bold text-[#102643]">{stage.label}</p></div><p className="mt-2 text-[11px] leading-5 text-slate-600">{event ? `${event.actorLabel} · ${new Date(event.createdAt).toLocaleString()}` : stage.detail}</p></li>; })}</ol><div className="mt-5 rounded-xl border border-[#102643]/10 bg-[#fbfaf6] p-3"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><LockKeyhole className="h-3.5 w-3.5 text-[#c64e19]" />Immutable-source checkpoints</p><ol className="mt-3 space-y-2">{integrityEvents.length ? integrityEvents.map((event) => <li key={`${event.eventType}-${event.createdAt.toISOString()}`} className="flex items-start justify-between gap-3 text-xs"><span className="font-semibold text-[#102643]">{event.eventType.replaceAll("_", " ")}</span><span className="text-right text-slate-500">{new Date(event.createdAt).toLocaleString()}</span></li>) : <li className="text-xs text-slate-500">No integrity checkpoint is available yet.</li>}</ol></div>{timeline.returned && <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800"><Clock3 className="h-3.5 w-3.5" /> A constable requested clarification before final verification.</p>}</section>;
}
