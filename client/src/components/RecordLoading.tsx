import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

type RecordLoadingProps = {
  label?: string;
  dark?: boolean;
};

const lines = ["w-11/12", "w-full", "w-4/5"];

export default function RecordLoading({ label = "Opening the protected prototype record", dark = false }: RecordLoadingProps) {
  const surface = dark ? "border-white/10 bg-white/[0.055]" : "border-[#102643]/10 bg-[#fbfaf6]/95";
  const mutedSurface = dark ? "bg-white/10" : "bg-[#e7e5df]";
  const labelColor = dark ? "text-slate-300" : "text-slate-600";

  return (
    <main className={`${dark ? "bg-[#081626]" : "page-grid"} min-h-[calc(100vh-144px)] py-8 sm:py-12`} aria-busy="true" aria-live="polite">
      <div className="mx-auto grid max-w-5xl gap-5 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_250px]">
        <section className={`workspace-panel overflow-hidden rounded-[1.35rem] border shadow-[var(--panel-shadow)] ${surface}`}>
          <div className={`flex items-start justify-between gap-4 border-b p-5 sm:p-7 ${dark ? "border-white/10" : "border-[#102643]/10"}`} aria-hidden="true">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className={`loading-skeleton h-3 w-28 ${mutedSurface}`} />
              <Skeleton className={`loading-skeleton h-8 w-3/5 ${mutedSurface}`} />
              <Skeleton className={`loading-skeleton h-4 w-4/5 ${mutedSurface}`} />
            </div>
            <Skeleton className={`loading-skeleton h-8 w-20 rounded-full ${mutedSurface}`} />
          </div>
          <div className="space-y-5 p-5 sm:p-7">
            <div className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-black/10" : "border-[#102643]/8 bg-white/75"}`} aria-hidden="true">
              <div className="flex gap-2"><Skeleton className={`loading-skeleton h-10 flex-1 ${mutedSurface}`} /><Skeleton className={`loading-skeleton h-10 flex-1 ${mutedSurface}`} /><Skeleton className={`loading-skeleton hidden h-10 flex-1 sm:block ${mutedSurface}`} /></div>
            </div>
            <div className={`rounded-2xl border p-5 ${dark ? "border-white/10 bg-black/10" : "border-[#102643]/8 bg-white"}`} aria-hidden="true">
              <Skeleton className={`loading-skeleton h-4 w-36 ${mutedSurface}`} />
              <div className="mt-5 space-y-3">{lines.map((width) => <Skeleton key={width} className={`loading-skeleton h-4 ${width} ${mutedSurface}`} />)}</div>
              <Skeleton className={`loading-skeleton mt-6 h-11 w-32 ${mutedSurface}`} />
            </div>
          </div>
        </section>
        <aside className="hidden space-y-4 lg:block" aria-hidden="true">
          <section className={`rounded-2xl border p-5 ${dark ? "border-white/10 bg-white/[0.055]" : "border-[#102643]/10 bg-white/80"}`}>
            <Skeleton className={`loading-skeleton h-3 w-24 ${mutedSurface}`} />
            <div className="mt-5 space-y-4">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3"><Skeleton className={`loading-skeleton h-8 w-8 shrink-0 rounded-full ${mutedSurface}`} /><Skeleton className={`loading-skeleton h-3 flex-1 ${mutedSurface}`} /></div>)}</div>
          </section>
        </aside>
      </div>
      <p className={`mx-auto mt-5 max-w-5xl px-5 text-sm font-semibold sm:px-8 ${labelColor}`}>{label}</p>
    </main>
  );
}
