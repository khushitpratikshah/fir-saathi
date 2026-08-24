type CitizenJourneyStage = "intake" | "review" | "status";

const stages = [
  { id: "intake", label: "Save your details" },
  { id: "review", label: "Review your words" },
  { id: "status", label: "Sent for human review" },
] as const;

export default function CitizenJourneyProgress({ stage, question, compact = false }: { stage: CitizenJourneyStage; question?: string; compact?: boolean }) {
  const activeIndex = stages.findIndex((item) => item.id === stage);
  return (
    <section aria-label="Citizen journey progress" className={`surface-card ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="page-eyebrow text-[10px]">Your journey</p>{question && <p className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-xs font-bold text-[#102643]">{question}</p>}</div>
      <ol className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {stages.map((item, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          return <li key={item.id} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${isCurrent ? "border-[#102643] bg-[#102643] text-white shadow-[0_8px_16px_rgba(12,32,57,.12)]" : isComplete ? "status-success" : "border-[#102643]/6 bg-[#f5f2eb] text-slate-500"}`} aria-current={isCurrent ? "step" : undefined}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${isCurrent ? "bg-[#c64e19] text-white" : isComplete ? "bg-[#167e72] text-white" : "bg-white text-slate-500"}`}>{isComplete ? "✓" : index + 1}</span>{item.label}</li>;
        })}
      </ol>
    </section>
  );
}
