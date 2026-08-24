import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

type WorkspaceListSkeletonProps = {
  label: string;
  dark?: boolean;
};

export default function WorkspaceListSkeleton({ label, dark = false }: WorkspaceListSkeletonProps) {
  const page = dark ? "bg-[#081626] text-slate-100" : "app-real-surface text-[#102643]";
  const card = dark ? "border-white/10 bg-white/[0.055]" : "border-[#102643]/10 bg-white";
  const muted = dark ? "bg-white/10" : "bg-[#e7e5df]";

  return (
    <main className={`${page} min-h-[calc(100vh-144px)] py-8 sm:py-10`} aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <span className="sr-only">{label}</span>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" aria-hidden="true">
          <div className="space-y-3"><Skeleton className={`loading-skeleton h-3 w-32 ${muted}`} /><Skeleton className={`loading-skeleton h-8 w-72 max-w-full ${muted}`} /><Skeleton className={`loading-skeleton h-4 w-96 max-w-full ${muted}`} /></div>
          <Skeleton className={`loading-skeleton h-9 w-44 rounded-full ${muted}`} />
        </header>
        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-hidden="true">{[1, 2, 3].map((item) => <article key={item} className={`rounded-2xl border p-5 ${card}`}><Skeleton className={`loading-skeleton h-5 w-5 rounded-lg ${muted}`} /><Skeleton className={`loading-skeleton mt-4 h-6 w-16 ${muted}`} /><Skeleton className={`loading-skeleton mt-3 h-3 w-28 ${muted}`} /></article>)}</section>
        <section className={`mt-5 overflow-hidden rounded-2xl border shadow-[var(--panel-shadow-soft)] ${card}`} aria-hidden="true">
          <div className={`flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between ${dark ? "border-white/10" : "border-[#102643]/10"}`}><div className="space-y-2"><Skeleton className={`loading-skeleton h-4 w-44 ${muted}`} /><Skeleton className={`loading-skeleton h-3 w-60 ${muted}`} /></div><Skeleton className={`loading-skeleton h-10 w-full sm:w-64 ${muted}`} /></div>
          <div className={`divide-y ${dark ? "divide-white/10" : "divide-[#102643]/8"}`}>{[1, 2, 3, 4].map((item) => <div key={item} className="flex items-center justify-between gap-4 p-5"><div className="min-w-0 flex-1 space-y-2"><Skeleton className={`loading-skeleton h-4 w-40 ${muted}`} /><Skeleton className={`loading-skeleton h-3 w-3/5 ${muted}`} /></div><Skeleton className={`loading-skeleton h-8 w-24 shrink-0 rounded-full ${muted}`} /></div>)}</div>
        </section>
      </div>
    </main>
  );
}
