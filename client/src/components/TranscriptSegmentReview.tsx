import { Clock3, MessageSquarePlus, Play } from "lucide-react";
import { formatTranscriptTime, type TranscriptSegment } from "../../../shared/transcriptReview";

type Props = {
  segments: TranscriptSegment[];
  selected?: TranscriptSegment | null;
  onSelect?: (segment: TranscriptSegment) => void;
  onSeek?: (segment: TranscriptSegment) => void;
  dark?: boolean;
  title?: string;
};

export default function TranscriptSegmentReview({ segments, selected, onSelect, onSeek, dark = false, title = "Transcript timecodes" }: Props) {
  if (!segments.length) return null;
  const card = dark ? "border-white/10 bg-white/[0.055] text-slate-100" : "border-[#102643]/10 bg-white text-[#102643]";
  const muted = dark ? "text-slate-400" : "text-slate-600";
  return <section className={`rounded-2xl border p-5 ${card}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"><Clock3 className="h-3.5 w-3.5 text-[#f48a51]" />{title}</p><p className={`mt-2 text-xs leading-5 ${muted}`}>Times locate portions of the original capture. They do not rewrite the source record or expose encrypted stored evidence.</p></div><span className="rounded-full bg-[#f5f2eb] px-2.5 py-1 text-[10px] font-bold text-slate-600">{segments.length} segment{segments.length === 1 ? "" : "s"}</span></div><ol className="mt-4 space-y-2">{segments.map((segment, index) => { const active = selected?.startSeconds === segment.startSeconds && selected?.endSeconds === segment.endSeconds && selected?.text === segment.text; return <li key={`${segment.startSeconds}-${segment.endSeconds}-${index}`}><div className={`flex gap-2 rounded-xl border p-3 transition-colors ${active ? "border-[#c64e19]/50 bg-[#fff4ee]" : dark ? "border-white/10 bg-black/15" : "border-[#102643]/10 bg-[#fbfaf6]"}`}><button type="button" onClick={() => onSelect?.(segment)} disabled={!onSelect} aria-pressed={active} className="focus-ring min-w-0 flex-1 text-left disabled:cursor-default"><span className="flex items-start gap-3"><span className="shrink-0 rounded-md bg-[#102643] px-2 py-1 font-mono text-[10px] font-bold text-white">{formatTranscriptTime(segment.startSeconds)}–{formatTranscriptTime(segment.endSeconds)}</span><span className="min-w-0 flex-1 text-sm leading-6">{segment.text}</span>{onSelect && <MessageSquarePlus className="mt-1 h-4 w-4 shrink-0 text-[#c64e19]" aria-hidden="true" />}</span></button>{onSeek && <button type="button" onClick={() => onSeek(segment)} className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-lg border border-[#102643]/15 bg-white px-2.5 text-[11px] font-bold text-[#102643]"><Play className="h-3.5 w-3.5" />Play</button>}</div></li>; })}</ol></section>;
}
