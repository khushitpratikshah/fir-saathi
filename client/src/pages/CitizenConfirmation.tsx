import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, CheckCircle2, CircleAlert, FileText, Headphones, Loader2, RefreshCcw, ShieldCheck, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import FirSaathiShell from "@/components/FirSaathiShell";
import CitizenJourneyProgress from "@/components/CitizenJourneyProgress";
import ComplaintStatusPill from "@/components/ComplaintStatusPill";
import RecordLoading from "@/components/RecordLoading";
import TranscriptSegmentReview from "@/components/TranscriptSegmentReview";
import { getAdaptiveFollowUps, getCitizenChosenContextOptions, type AdaptiveFollowUp } from "@/lib/adaptiveFollowUps";
import { trpc } from "@/lib/trpc";
import { getLocalAudioReview } from "@/lib/localAudioReview";
import { shouldReportReadBackError } from "@/lib/citizenRecovery";
import type { TranscriptSegment } from "../../../shared/transcriptReview";

const languageLabel = { en: "English", hi: "हिन्दी", gu: "ગુજરાતી", mr: "मराठी", bn: "বাংলা", ta: "தமிழ்", te: "తెలుగు", kn: "ಕನ್ನಡ", ml: "മലയാളം", pa: "ਪੰਜਾਬੀ" } as const;

export default function CitizenConfirmation() {
  const [, params] = useRoute("/confirm/:publicId");
  const [, navigate] = useLocation();
  const publicId = params?.publicId ?? "";
  const localAudioUrl = useMemo(() => getLocalAudioReview(publicId), [publicId]);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const detail = trpc.complaints.get.useQuery({ publicId }, { enabled: Boolean(publicId) });
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [fallbackAcknowledged, setFallbackAcknowledged] = useState(false);
  const [clarification, setClarification] = useState("");
  const [followUpValue, setFollowUpValue] = useState("");
  const [skippedFollowUps, setSkippedFollowUps] = useState<Set<string>>(() => new Set());
  const [chosenContextQuestion, setChosenContextQuestion] = useState<AdaptiveFollowUp | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<TranscriptSegment | null>(null);
  const [transcriptCorrection, setTranscriptCorrection] = useState("");
  const selectedLanguage = detail.data?.complaint.language;

  const confirm = trpc.complaints.confirm.useMutation({
    onSuccess: () => {
      toast.success("Your confirmation was recorded. The draft is ready for constable review.");
      navigate(`/status/${publicId}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const utils = trpc.useUtils();
  const addClarification = trpc.complaints.addClarification.useMutation({
    onSuccess: async () => {
      await utils.complaints.get.invalidate({ publicId });
      setClarification("");
      toast.success("Your clarification was added separately from the source statement.");
    },
    onError: (error) => toast.error(error.message),
  });
  const addContext = trpc.complaints.addContext.useMutation({
    onSuccess: async () => {
      await utils.complaints.get.invalidate({ publicId });
      setFollowUpValue("");
      setChosenContextQuestion(null);
      toast.success("Your detail was saved separately from the source statement.");
    },
    onError: (error) => toast.error(error.message),
  });
  const addTranscriptCorrection = trpc.complaints.addTranscriptCorrection.useMutation({
    onSuccess: async () => {
      await utils.complaints.get.invalidate({ publicId });
      setTranscriptCorrection("");
      setSelectedSegment(null);
      toast.success("Your correction note was added separately from the source statement.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!selectedLanguage || !("speechSynthesis" in window)) {
      setSpeechAvailable(false);
      return;
    }
    const updateVoices = () => {
      setSpeechAvailable(window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().startsWith(selectedLanguage)));
    };
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      window.speechSynthesis.cancel();
    };
  }, [selectedLanguage]);

  const languageName = useMemo(() => selectedLanguage ? languageLabel[selectedLanguage] : "", [selectedLanguage]);
  const retryReadBackVoice = () => {
    if (!selectedLanguage || !("speechSynthesis" in window)) return;
    const available = window.speechSynthesis.getVoices().some((voice) => voice.lang.toLowerCase().startsWith(selectedLanguage));
    setSpeechAvailable(available);
    toast.message(available ? "A suitable browser voice is now available." : "No suitable voice is available yet. You can use the text read-back below.");
  };

  if (detail.isLoading) {
    return <FirSaathiShell><RecordLoading label="Opening your source statement" /></FirSaathiShell>;
  }

  if (!detail.data) {
    return <FirSaathiShell><main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="max-w-md text-center"><CircleAlert className="mx-auto h-8 w-8 text-[#c64e19]" /><h1 className="mt-4 text-3xl font-bold tracking-[-0.04em]">This draft is unavailable.</h1><p className="mt-2 text-sm leading-6 text-slate-600">The prototype record could not be found or opened.</p><Link href="/intake" className="focus-ring mt-6 inline-flex rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white">Return to intake</Link></div></main></FirSaathiShell>;
  }

  const { complaint, fields, evidence, audit } = detail.data;
  const draft = complaint.draftJson;
  const returnRequest = audit.find((event) => event.eventType === "returned");
  const needsCarefulTranscriptReview = audit.some((event) => event.eventType === "transcribed" && /careful citizen read-back/i.test(event.newValue ?? ""));
  const citizenContext = fields.filter((field) => field.source === "citizen_context");
  const transcriptSegments = evidence.flatMap((item) => item.encryptionMetadata?.transcriptSegments ?? []);
  const nextFollowUp = getAdaptiveFollowUps(fields.map((field) => ({ key: field.fieldKey, source: field.source })), complaint.sourceTranscript).find((question) => !skippedFollowUps.has(question.key));
  const chosenContextOptions = getCitizenChosenContextOptions(fields.map((field) => ({ key: field.fieldKey, source: field.source })));
  const activeFollowUp = nextFollowUp ?? chosenContextQuestion;
  const playReadBack = () => {
    if (!speechAvailable) return;
    const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith(complaint.language));
    const utterance = new SpeechSynthesisUtterance(complaint.sourceTranscript);
    utterance.lang = complaint.language;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setHasListened(true);
    utterance.onerror = (event) => {
      if (shouldReportReadBackError(event.error)) toast.error("Read-back could not play. You may use the accessible text fallback.");
    };
    window.speechSynthesis.cancel();
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 0);
  };
  const seekLocalAudio = (segment: TranscriptSegment) => {
    if (!localAudioRef.current) {
      toast.message("The original recording is not retained in this browser session. You can still review the source text and add a separate note.");
      return;
    }
    localAudioRef.current.currentTime = segment.startSeconds;
    void localAudioRef.current.play().catch(() => toast.message("Playback needs a browser interaction. Use the audio controls to listen at the selected time."));
  };

  return (
    <FirSaathiShell compact>
      <main className="page-grid min-h-[calc(100vh-144px)] py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <Link href="/intake" className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold text-slate-600 hover:text-[#102643]"><ArrowLeft className="h-4 w-4" /> Back to intake</Link>
          <div className="mt-5"><CitizenJourneyProgress stage="review" /></div>
          <section className="mt-5 overflow-hidden rounded-[1.4rem] border border-[#102643]/10 bg-[#fbfaf6]/95 shadow-[0_22px_55px_rgba(12,32,57,.09)]">
            <div className="border-b border-[#102643]/10 px-5 py-6 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Citizen confirmation</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Check what will go to review.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your source statement is shown separately. The structured area is an assistance draft; it does not change what you said.</p></div>
                <ComplaintStatusPill status={complaint.status} />
              </div>
            </div>
            <div className="space-y-6 p-5 sm:p-7">
              <section className="rounded-2xl border border-[#102643]/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your source statement</p><p className="mt-1 text-xs font-semibold text-[#c64e19]">{languageName}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15803d]"><ShieldCheck className="h-3.5 w-3.5" /> Kept separately</span></div>
                <blockquote lang={complaint.language} className="mt-5 border-l-2 border-[#c64e19] pl-4 text-base leading-8 text-[#102643]">{complaint.sourceTranscript}</blockquote>
              </section>

              {localAudioUrl && <section className="rounded-2xl border border-[#102643]/10 bg-[#f5f2eb] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">This-browser recording review</p><p className="mt-2 text-xs leading-5 text-slate-600">This preview is available only during this browser session. The stored evidence remains encrypted and is not exposed here.</p><audio ref={localAudioRef} controls preload="metadata" src={localAudioUrl} className="mt-3 h-9 w-full" aria-label="Original recorded statement preview" /></section>}
              <TranscriptSegmentReview segments={transcriptSegments} selected={selectedSegment} onSelect={setSelectedSegment} onSeek={localAudioUrl ? seekLocalAudio : undefined} title="Review transcript timecodes" />
              {selectedSegment && <section className="rounded-2xl border border-[#c64e19]/20 bg-[#fff7f2] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a83d10]">Add a correction note</p><p className="mt-2 text-sm font-bold text-[#102643]">About “{selectedSegment.text}”</p><p className="mt-1 text-xs leading-5 text-slate-600">Your note is saved separately. It will not replace or rewrite the original transcript.</p><textarea value={transcriptCorrection} onChange={(event) => setTranscriptCorrection(event.target.value)} maxLength={1000} rows={3} className="focus-ring mt-4 w-full resize-y rounded-xl border border-[#c64e19]/25 bg-white p-3 text-sm leading-6 text-[#102643]" placeholder="For example, clarify a name, place, number, or word you think the transcript captured incorrectly." /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-slate-500">{transcriptCorrection.length}/1000</p><div className="flex gap-2"><button type="button" onClick={() => { setSelectedSegment(null); setTranscriptCorrection(""); }} className="focus-ring rounded-lg px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="button" disabled={transcriptCorrection.trim().length < 2 || addTranscriptCorrection.isPending} onClick={() => addTranscriptCorrection.mutate({ publicId, passage: selectedSegment.text, startSeconds: selectedSegment.startSeconds, endSeconds: selectedSegment.endSeconds, note: transcriptCorrection })} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#102643] px-3 text-xs font-bold text-white disabled:opacity-50">{addTranscriptCorrection.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save separate note</button></div></div></section>}

              {needsCarefulTranscriptReview && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" /><div><p className="text-sm font-bold text-amber-950">Please check this transcript carefully.</p><p className="mt-1 text-xs leading-5 text-amber-900">The speech service detected one or more unclear audio segments. It did not change your words. Use the read-back below and return to intake for a new recording if the source text is not what you said.</p></div></div></section>}

              <section className="rounded-2xl border border-[#102643]/10 bg-[#f5f2eb] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Spoken read-back</p><p className="mt-1 text-sm font-bold text-[#102643]">Listen to your source statement before confirming.</p></div>
                  {speechAvailable ? <div className="flex gap-2"><button type="button" onClick={playReadBack} className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[#102643] px-3 py-2 text-xs font-bold text-white"><Volume2 className="h-3.5 w-3.5" /> Play read-back</button><button type="button" onClick={() => window.speechSynthesis.cancel()} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[#102643]/12 bg-white px-3 py-2 text-xs font-bold text-slate-600"><Square className="h-3.5 w-3.5" /> Stop</button></div> : <div className="w-full rounded-xl border border-[#c64e19]/20 bg-[#fff5ef] p-3 text-xs leading-5 text-[#8f360e]"><div className="flex gap-2"><Headphones className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-bold">A suitable browser voice is unavailable for {languageName}.</p><p className="mt-1">You can always use the source text above. To try spoken read-back again, check your device’s text-to-speech voice settings and return after downloading or enabling a voice for this language.</p></div></div><button type="button" onClick={retryReadBackVoice} className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#c64e19]/30 bg-white px-3 py-2 text-xs font-bold text-[#8f360e]"><RefreshCcw className="h-3.5 w-3.5" /> Check voices again</button><label className="mt-3 flex items-start gap-2 border-t border-[#c64e19]/15 pt-3"><input type="checkbox" checked={fallbackAcknowledged} onChange={(event) => setFallbackAcknowledged(event.target.checked)} className="focus-ring mt-0.5 h-4 w-4 rounded accent-[#c64e19]" />I have read the source record above and want to continue using the accessible text fallback.</label></div>}
                </div>
                {speechAvailable && <p className="mt-3 text-xs leading-5 text-slate-600">The browser reads the source statement in the selected language. Playback is not stored.</p>}
                {hasListened && <p className="mt-3 text-xs font-bold text-[#15803d]">Read-back started. You may now confirm or return to make a correction.</p>}
              </section>

              <section className="rounded-2xl border border-[#102643]/10 bg-[#f5f2eb] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Optional detail check</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">We checked the transcript first. We only ask about an important detail when it was not found in your words or already added separately.</p>
                {activeFollowUp ? <div className="mt-4 rounded-xl border border-[#c64e19]/20 bg-[#fff6f1] p-4"><p className="text-sm font-bold text-[#8f360e]">{activeFollowUp.label}</p><p className="mt-1 text-xs leading-5 text-[#8f360e]">{activeFollowUp.helper}</p><input value={followUpValue} onChange={(event) => setFollowUpValue(event.target.value)} maxLength={activeFollowUp.maxLength} className="focus-ring mt-3 h-11 w-full rounded-lg border border-[#c64e19]/25 bg-white px-3 text-sm text-[#102643]" placeholder={activeFollowUp.placeholder} /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => nextFollowUp ? setSkippedFollowUps((current) => new Set(Array.from(current).concat(nextFollowUp.key))) : setChosenContextQuestion(null)} className="focus-ring text-xs font-bold text-slate-600 underline underline-offset-4">Skip for now</button><button type="button" disabled={followUpValue.trim().length < 2 || addContext.isPending} onClick={() => addContext.mutate({ publicId, key: activeFollowUp.key, value: followUpValue })} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#102643] px-3 text-xs font-bold text-white disabled:opacity-50">{addContext.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add this detail</button></div></div> : <div className="mt-4 rounded-xl bg-white p-3"><p className="text-sm font-semibold text-[#15803d]">No further high-value follow-up is needed from the information you chose to provide.</p>{chosenContextOptions.length > 0 && <div className="mt-3"><p className="text-xs font-bold text-slate-600">Add another optional detail</p><div className="mt-2 flex flex-wrap gap-2">{chosenContextOptions.map((option) => <button key={option.key} type="button" onClick={() => setChosenContextQuestion(option)} className="focus-ring rounded-lg border border-[#102643]/15 px-3 py-2 text-xs font-bold text-[#102643] hover:bg-[#f5f2eb]">{option.label}</button>)}</div></div>}</div>}
              </section>

              {citizenContext.length > 0 && <section className="rounded-2xl border border-[#102643]/10 bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your separately provided incident context</p><p className="mt-1 text-xs leading-5 text-slate-600">These optional details are shown separately and do not alter your source statement.</p><dl className="mt-4 grid gap-3 sm:grid-cols-2">{citizenContext.map((field) => <div key={field.id} className="rounded-xl bg-[#fbfaf6] p-3"><dt className="text-[11px] font-bold text-[#102643]">{field.label}</dt><dd className="mt-1 text-sm leading-6 text-slate-600">{field.value}</dd></div>)}</dl></section>}

              {complaint.status === "returned" && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><div className="flex gap-3"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" /><div><p className="text-sm font-bold text-amber-950">A constable asked for clarification.</p><p className="mt-1 text-xs leading-5 text-amber-900">{returnRequest?.reason || "Please add the requested factual detail in your own words."}</p></div></div><label className="mt-4 block text-xs font-bold text-amber-950">Your clarification<textarea value={clarification} onChange={(event) => setClarification(event.target.value)} rows={4} maxLength={2000} className="focus-ring mt-1.5 w-full resize-y rounded-xl border border-amber-300 bg-white p-3 text-sm font-normal leading-6 text-[#102643]" placeholder="Add only the detail you want to provide. This is saved separately and will not rewrite your original statement." /></label><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-amber-900">{clarification.length}/2000</p><button type="button" disabled={clarification.trim().length < 4 || addClarification.isPending} onClick={() => addClarification.mutate({ publicId, clarification })} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-900 px-3 text-xs font-bold text-white disabled:opacity-50">{addClarification.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add clarification</button></div></section>}

              <aside className="rounded-2xl border border-[#c64e19]/20 bg-[#fff5ef] p-4"><div className="flex gap-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#c64e19]" /><div><p className="text-sm font-bold text-[#8f360e]">Before you send this to review</p><p className="mt-1 text-xs leading-5 text-[#8f360e]">Your explicit confirmation sends a draft to the constable workspace. It does not register an FIR or decide any legal section.</p></div></div></aside>
              <div className="flex flex-col gap-3 border-t border-[#102643]/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#c64e19]" /> Your confirmation sends a draft to a constable. It does not register an FIR.</p><button type="button" disabled={confirm.isPending || complaint.status === "verified" || (!hasListened && !fallbackAcknowledged)} onClick={() => confirm.mutate({ publicId })} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white disabled:opacity-50">{confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{complaint.status === "returned" ? "Send response for review" : "Confirm and send for review"}</button></div>
            </div>
          </section>
        </div>
      </main>
    </FirSaathiShell>
  );
}
