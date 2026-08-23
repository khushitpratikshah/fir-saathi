type CitizenJourneyStage = "intake" | "review" | "status";

const stages = [
  { id: "intake", label: "Save your details" },
  { id: "review", label: "Review your words" },
  { id: "status", label: "Sent for human review" },
] as const;

export default function CitizenJourneyProgress({ stage, question, compact = false }: { stage: CitizenJourneyStage; question?: string; compact?: boolean }) {
  const activeIndex = stages.findIndex((item) => item.id === stage);
  return (
    <section aria-label="Citizen journey progress" className={`rounded-2xl border border-[#102643]/10 bg-white/75 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your journey</p>{question && <p className="text-xs font-semibold text-[#102643]">{question}</p>}</div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {stages.map((item, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          return <li key={item.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold ${isCurrent ? "bg-[#102643] text-white" : isComplete ? "bg-emerald-50 text-emerald-800" : "bg-[#f5f2eb] text-slate-500"}`} aria-current={isCurrent ? "step" : undefined}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${isCurrent ? "bg-[#c64e19] text-white" : isComplete ? "bg-emerald-600 text-white" : "bg-white text-slate-500"}`}>{isComplete ? "✓" : index + 1}</span>{item.label}</li>;
        })}
      </ol>
    </section>
  );
}
