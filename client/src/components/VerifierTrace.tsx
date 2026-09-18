import { useMemo } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import { buildVerifierTrace, highlightSource } from "@/lib/judgeScenarios";

type TraceField = { label: string; value: string; sourceQuote?: string };

type Props = {
  sourceTranscript: string;
  fields: TraceField[];
  droppedFields?: string[];
  dark?: boolean;
};

export default function VerifierTrace({
  sourceTranscript,
  fields,
  droppedFields = [],
  dark = true,
}: Props) {
  const trace = useMemo(
    () => buildVerifierTrace(sourceTranscript, fields, droppedFields),
    [sourceTranscript, fields, droppedFields]
  );
  const quotes = trace.matched.map(field => field.sourceQuote ?? field.value);
  const sourceParts = useMemo(
    () => highlightSource(sourceTranscript, quotes),
    [sourceTranscript, quotes]
  );
  const card = dark
    ? "border-white/10 bg-white/[0.055] text-slate-100"
    : "border-[#102643]/10 bg-white text-[#102643]";
  const muted = dark ? "text-slate-400" : "text-slate-600";

  return (
    <section
      className={`rounded-2xl border p-5 ${card}`}
      aria-label="Deterministic verifier trace"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#f48a51]">
            Verifier trace
          </p>
          <h2 className="mt-1 text-lg font-bold">
            Source coverage, not model trust
          </h2>
          <p className={`mt-1 text-xs leading-5 ${muted}`}>
            Green values are accepted only when their exact contiguous text
            exists in the source statement.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
          <Check className="h-3.5 w-3.5" />
          Deterministic
        </span>
      </div>
      <div
        className={`mt-4 rounded-xl border p-3 text-sm leading-7 ${dark ? "border-emerald-400/20 bg-emerald-400/5" : "border-emerald-200 bg-emerald-50"}`}
      >
        <p
          className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-emerald-300" : "text-emerald-800"}`}
        >
          Original source transcript
        </p>
        <blockquote className={dark ? "text-slate-100" : "text-[#102643]"}>
          {sourceParts.map((part, index) =>
            part.highlighted ? (
              <mark
                key={`${part.text}-${index}`}
                className="rounded bg-emerald-300/80 px-1 text-[#062b1a]"
              >
                {part.text}
              </mark>
            ) : (
              <span key={`${part.text}-${index}`}>{part.text}</span>
            )
          )}
        </blockquote>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {fields.map(field => {
          const matched = trace.matched.some(
            item => item.label === field.label && item.value === field.value
          );
          return (
            <div
              key={`${field.label}-${field.value}`}
              className={`rounded-xl border p-3 ${matched ? (dark ? "border-emerald-400/25 bg-emerald-400/10" : "border-emerald-200 bg-emerald-50") : dark ? "border-rose-400/25 bg-rose-400/10" : "border-rose-200 bg-rose-50"}`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.12em] ${matched ? (dark ? "text-emerald-300" : "text-emerald-800") : "text-rose-400"}`}
              >
                {field.label}
              </p>
              <p className="mt-1 text-sm font-semibold">{field.value}</p>
              <p
                className={`mt-1 text-[11px] ${matched ? (dark ? "text-emerald-300" : "text-emerald-700") : "text-rose-400"}`}
              >
                {matched
                  ? "Exact source match"
                  : "Dropped: no exact source match"}
              </p>
            </div>
          );
        })}
      </div>
      {droppedFields.length > 0 && (
        <div
          className={`mt-4 rounded-xl border p-3 ${dark ? "border-rose-400/25 bg-rose-400/10" : "border-rose-200 bg-rose-50"}`}
        >
          <p className="flex items-center gap-2 text-xs font-bold text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            Dropped by deterministic normalizer
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-rose-300">
            {droppedFields.map(field => (
              <li key={field} className="flex gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
