import { CheckCircle2, CloudCog, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import AnimatedWaveform from "@/components/AnimatedWaveform";

type GroqState = "idle" | "encrypting" | "preparing" | "failed";

type Props = {
  state: GroqState;
  seconds: number;
  error: string | null;
  languageLabel: string;
  onCancel: () => void;
  onRetry: () => void;
  onTypeInstead: () => void;
};

export default function GroqTranscriptionStatus({ state, seconds, error, languageLabel, onCancel, onRetry, onTypeInstead }: Props) {
  if (state === "idle") return null;

  if (state === "failed") {
    return <div role="alert" className="mt-5 rounded-xl border border-[#c64e19]/30 bg-white p-4 text-[#8f360e]"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff0e8]"><TriangleAlert className="h-4 w-4" /></span><div><p className="text-sm font-bold">Groq transcription could not finish.</p><p className="mt-1 text-xs leading-5">{error || "The recording was not converted to a transcript. No draft was sent to review."}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onRetry} className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[#102643] px-3 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" /> Retry transcription</button><button type="button" onClick={onTypeInstead} className="focus-ring rounded-lg border border-[#c64e19]/30 bg-white px-3 py-2 text-xs font-bold text-[#8f360e]">Type statement instead</button></div></div>;
  }

  const progress = state === "encrypting" ? 12 : Math.min(92, 20 + seconds * 1.3);
  const title = state === "encrypting" ? "Encrypting the recording on this device…" : "Groq is preparing your transcript…";
  const detail = state === "encrypting" ? "Your audio is being encrypted before it leaves the browser." : `Transcribing in ${languageLabel}. ${seconds}s elapsed — you can cancel at any time.`;

  return <section role="status" aria-live="polite" aria-atomic="true" className="mt-5 overflow-hidden rounded-xl border border-[#c64e19]/25 bg-white shadow-[0_8px_22px_rgba(198,78,25,.06)]"><div className="flex items-start gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff0e8] text-[#c64e19]"><CloudCog className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[#102643]">{title}</p><span className="inline-flex items-center gap-1 rounded-full bg-[#fff5ef] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9b3a0d]"><Loader2 className="h-3 w-3 animate-spin" /> AI processing</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></div></div><div className="mx-4 rounded-xl border border-[#102643]/8 bg-[#fbfaf6] px-3"><AnimatedWaveform active tone="ember" className="h-9" label="Animated recording signal being prepared for transcription" /></div><div className="mx-4 mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1ebe5]"><div className="h-full rounded-full bg-[#c64e19] transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} /></div><div className="grid gap-2 px-4 pb-4 pt-3 text-[11px] sm:grid-cols-3"><span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Local encryption</span><span className={`inline-flex items-center gap-1.5 font-semibold ${state === "preparing" ? "text-[#c64e19]" : "text-slate-500"}`}>{state === "preparing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-current" />} Groq transcription</span><span className="inline-flex items-center gap-1.5 font-semibold text-slate-500"><span className="h-3.5 w-3.5 rounded-full border border-current" /> Source record</span></div>{state === "preparing" && <div className="mx-4 mb-4 rounded-lg bg-[#fff5ef] px-3 py-2 text-[11px] leading-5 text-[#8f360e]"><b>What happens next:</b> the transcript stays separate from the structured draft. AI will only surface exact source-backed details and missing questions.</div>}<div className="border-t border-[#102643]/8 bg-[#fbfaf6] px-4 py-3"><button type="button" onClick={onCancel} className="focus-ring text-xs font-bold text-[#102643] underline decoration-[#c64e19]/50 underline-offset-4">Cancel and keep using this page</button></div></section>;
}
