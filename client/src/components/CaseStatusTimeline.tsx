import { CheckCircle2, CircleDotDashed, Clock3, FilePenLine, SendHorizonal, ShieldCheck, Undo2 } from "lucide-react";

export type TimelineAuditEvent = { eventType: string; createdAt: Date; actorLabel: string };
type Props = { status: string; audit: TimelineAuditEvent[] };

const stages = [
  { eventType: "created", label: "Intake created", icon: FilePenLine, detail: "Citizen source record opened" },
  { eventType: "drafted", label: "Draft prepared", icon: CircleDotDashed, detail: "Source-backed working fields created" },
  { eventType: "citizen_confirmed", label: "Citizen confirmed", icon: SendHorizonal, detail: "Record sent to constable review" },
  { eventType: "verified", label: "Human verified", icon: ShieldCheck, detail: "Constable verification completed" },
];

export function buildCaseTimeline(status: string, audit: TimelineAuditEvent[]) {
  const ascending = [...audit].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const latestByType = (eventType: string) => [...ascending].reverse().find((event) => event.eventType === eventType);
  const returned = latestByType("returned");
  const displayStages = returned ? [...stages.slice(0, 3), { eventType: "returned", label: "Clarification requested", icon: Undo2, detail: "Returned with a documented reason" }] : stages;
  return { status, returned, stages: displayStages.map((stage) => ({ ...stage, event: latestByType(stage.eventType) })) };
}

export default function CaseStatusTimeline({ status, audit }: Props) {
  const timeline = buildCaseTimeline(status, audit);
  return <section className="rounded-2xl border border-[#102643]/10 bg-white p-5 shadow-[0_14px_35px_rgba(12,32,57,.05)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Case status timeline</p><p className="mt-1 text-sm font-bold text-[#102643]">The record’s lifecycle, from source to human decision.</p></div><span className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-slate-600">{timeline.status.replaceAll("_", " ")}</span></div><ol className="mt-5 grid gap-3 sm:grid-cols-2">{timeline.stages.map((stage) => { const { event } = stage; const Icon = stage.icon; return <li key={stage.eventType} className={`rounded-xl border p-3 ${event ? "border-[#15803d]/25 bg-emerald-50" : "border-[#102643]/8 bg-[#fbfaf6]"}`}><div className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full ${event ? "bg-[#15803d] text-white" : "bg-slate-200 text-slate-500"}`}>{event ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><p className="text-xs font-bold text-[#102643]">{stage.label}</p></div><p className="mt-2 text-[11px] leading-5 text-slate-600">{event ? `${event.actorLabel} · ${new Date(event.createdAt).toLocaleString()}` : stage.detail}</p></li>; })}</ol>{timeline.returned && <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800"><Clock3 className="h-3.5 w-3.5" /> A constable requested clarification before final verification.</p>}</section>;
}
