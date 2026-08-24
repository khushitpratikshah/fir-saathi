import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { BrainCircuit, Check, ChevronLeft, ChevronRight, CircleAlert, Copy, FileKey2, FileText, Headphones, Keyboard, Loader2, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import CitizenJourneyProgress from "@/components/CitizenJourneyProgress";
import FirSaathiShell from "@/components/FirSaathiShell";
import GroqTranscriptionStatus from "@/components/GroqTranscriptionStatus";
import { trpc } from "@/lib/trpc";
import { userFacingGroqError } from "@/lib/groqTranscription";
import { getSourceStatementReadiness } from "@/lib/sourceStatementReadiness";
import { getAudioLevelFeedback, type AudioLevelFeedback } from "@/lib/audioLevel";
import { retainLocalAudioReview } from "@/lib/localAudioReview";

const languages = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
] as const;

type Language = (typeof languages)[number]["code"];
type VoiceState = "idle" | "encrypting" | "preparing" | "failed";
type CitizenContextInput = {
  incident_when: string;
  incident_where: string;
  people_or_vehicle: string;
  property_or_loss: string;
  injury_or_safety: string;
  follow_up_contact: string;
};

const emptyContext: CitizenContextInput = {
  incident_when: "",
  incident_where: "",
  people_or_vehicle: "",
  property_or_loss: "",
  injury_or_safety: "",
  follow_up_contact: "",
};

const steps = ["Choose language", "Your own words", "Transcript check"] as const;
const coverageLabels = {
  when: "when this happened",
  where: "where this happened",
  people_or_vehicle: "people or vehicle detail",
  property_or_loss: "property or loss detail",
  injury_or_safety: "injury or immediate safety",
} as const;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

export default function CitizenIntake() {
  const [language, setLanguage] = useState<Language>("en");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [consent, setConsent] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [context, setContext] = useState<CitizenContextInput>(emptyContext);
  const [activeStep, setActiveStep] = useState(0);
  const [resumeCode, setResumeCode] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "ready">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<AudioLevelFeedback>({ level: 0, state: "silent", label: "Start recording to check your microphone level." });
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [preparingSeconds, setPreparingSeconds] = useState(0);
  const [coverageSource, setCoverageSource] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const preparationTimerRef = useRef<number | null>(null);
  const voiceTimeoutRef = useRef<number | null>(null);
  const activeVoiceAttemptRef = useRef<string | null>(null);
  const audioPreviewUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const levelAnimationFrameRef = useRef<number | null>(null);
  const lastLevelUpdateRef = useRef(0);
  const [, navigate] = useLocation();
  const [storedResumeCode] = useState(() => window.sessionStorage.getItem("fir-saathi-resume-code") ?? "");
  const restoredDraft = trpc.complaints.resumeIntakeDraft.useQuery(
    { resumeCode: storedResumeCode },
    { enabled: storedResumeCode.length >= 12, retry: false },
  );
  const createComplaint = trpc.complaints.create.useMutation({
    onSuccess: ({ publicId }) => {
      window.sessionStorage.removeItem("fir-saathi-resume-code");
      navigate(`/confirm/${publicId}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const createVoiceComplaint = trpc.evidence.captureAndTranscribe.useMutation();
  const sourceCoverage = trpc.complaints.previewSourceCoverage.useMutation({
    onSuccess: (preview) => {
      if (!preview.available) {
        toast.message("The AI coverage check is unavailable. Your original words remain unchanged and you can continue.");
        return;
      }
      const focus = preview.potentialGaps.map((gap) => coverageLabels[gap]).slice(0, 2);
      toast.success("AI coverage check complete", {
        description: focus.length
          ? `The next review can stay focused on ${focus.join(" and ")}. Your words were not changed.`
          : "Your words were not changed; the transcript check can continue.",
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const saveDraft = trpc.complaints.saveIntakeDraft.useMutation({
    onSuccess: ({ resumeCode: savedCode, expiresAt, updatedExisting }) => {
      setResumeCode(savedCode);
      window.sessionStorage.setItem("fir-saathi-resume-code", savedCode);
      toast.success(updatedExisting ? "Your saved intake was updated." : "Your intake was saved. Keep the private code below.", {
        description: `Available until ${new Date(expiresAt).toLocaleString()}.`,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedLanguage = languages.find((item) => item.code === language)?.label ?? "selected language";
  const sourceReadiness = getSourceStatementReadiness(sourceText);
  const coverage = coverageSource === sourceText ? sourceCoverage.data : undefined;

  useEffect(() => {
    if (!restoredDraft.data) return;
    setLanguage(restoredDraft.data.language);
    setSourceText(restoredDraft.data.sourceTranscript);
    setContext((current) => ({ ...current, ...restoredDraft.data.context }));
    setConsent(true);
    setMode("text");
    setActiveStep(Math.max(0, Math.min(2, restoredDraft.data.currentStep - 1)));
    setResumeCode(storedResumeCode);
    window.sessionStorage.removeItem("fir-saathi-resume-code");
    toast.success("Your saved intake was restored. Continue when you are ready.");
  }, [restoredDraft.data, storedResumeCode]);

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };
  const clearPreparationTimers = () => {
    if (preparationTimerRef.current) {
      window.clearInterval(preparationTimerRef.current);
      preparationTimerRef.current = null;
    }
    if (voiceTimeoutRef.current) {
      window.clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  };
  const finishVoiceAttempt = () => {
    activeVoiceAttemptRef.current = null;
    clearPreparationTimers();
  };
  const cancelVoicePreparation = (message = "Transcription was cancelled. The recording remains on this page, so you can retry or type your statement instead.") => {
    finishVoiceAttempt();
    createVoiceComplaint.reset();
    setVoiceState("failed");
    setVoiceError(message);
  };
  const stopAudioLevelMonitor = () => {
    if (levelAnimationFrameRef.current) window.cancelAnimationFrame(levelAnimationFrameRef.current);
    levelAnimationFrameRef.current = null;
    analyserSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
    analyserSourceRef.current = null;
    analyserRef.current = null;
    audioContextRef.current = null;
    lastLevelUpdateRef.current = 0;
    setAudioLevel({ level: 0, state: "silent", label: "Recording stopped. Listen back before sending it for transcript review." });
  };
  const startAudioLevelMonitor = (stream: MediaStream) => {
    stopAudioLevelMonitor();
    if (!window.AudioContext) return;
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      analyserSourceRef.current = source;
      const waveform = new Uint8Array(analyser.fftSize);
      const updateLevel = (now: number) => {
        analyser.getByteTimeDomainData(waveform);
        let squaredSum = 0;
        let peak = 0;
        waveform.forEach((sample) => {
          const normalized = (sample - 128) / 128;
          squaredSum += normalized * normalized;
          peak = Math.max(peak, Math.abs(normalized));
        });
        if (now - lastLevelUpdateRef.current >= 80) {
          setAudioLevel(getAudioLevelFeedback(Math.sqrt(squaredSum / waveform.length), peak));
          lastLevelUpdateRef.current = now;
        }
        levelAnimationFrameRef.current = window.requestAnimationFrame(updateLevel);
      };
      void audioContext.resume();
      levelAnimationFrameRef.current = window.requestAnimationFrame(updateLevel);
    } catch {
      setAudioLevel({ level: 0, state: "silent", label: "Live microphone level is unavailable in this browser. You can still record and listen back." });
    }
  };

  useEffect(() => () => {
    clearRecordingTimer();
    clearPreparationTimers();
    stopAudioLevelMonitor();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
  }, []);

  const beginRecording = async () => {
    if (!consent) {
      toast.message("Please confirm consent before starting the microphone.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("This browser does not support audio capture. Please use the text option.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: { ideal: 1 }, echoCancellation: { ideal: true }, noiseSuppression: { ideal: true }, autoGainControl: { ideal: true } } });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined);
      chunksRef.current = [];
      setVoiceError(null);
      setVoiceState("idle");
      streamRef.current = stream;
      startAudioLevelMonitor(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const nextAudio = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
        if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
        const nextPreviewUrl = URL.createObjectURL(nextAudio);
        audioPreviewUrlRef.current = nextPreviewUrl;
        setAudioPreviewUrl(nextPreviewUrl);
        setAudioBlob(nextAudio);
        setRecordingState("ready");
        stopAudioLevelMonitor();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        clearRecordingTimer();
      };
      recorder.start(1000);
      if (audioPreviewUrlRef.current) URL.revokeObjectURL(audioPreviewUrlRef.current);
      audioPreviewUrlRef.current = null;
      setAudioPreviewUrl(null);
      setAudioBlob(null);
      setRecordingSeconds(0);
      setRecordingState("recording");
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => {
        const nextSeconds = seconds + 1;
        if (nextSeconds === 90) {
          toast.message("Longer recordings can be harder to transcribe. You may continue, or stop and use text for any additional detail.");
        }
        return nextSeconds;
      }), 1000);
    } catch (error) {
      stopAudioLevelMonitor();
      toast.error(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone permission was not granted. You can use the text option instead."
        : "The microphone could not be started. Please use the text option instead.");
    }
  };

  const stopRecording = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); };
  const submitVoice = async () => {
    if (!audioBlob) {
      toast.error("Record a statement before continuing.");
      return;
    }
    if (audioBlob.size > 12 * 1024 * 1024) {
      toast.error("For this prototype, choose a recording smaller than 12 MB or use text input.");
      return;
    }
    if (!window.crypto?.subtle) {
      toast.error("This browser cannot encrypt the recording locally. Please use the text option.");
      return;
    }
    try {
      setVoiceError(null);
      setVoiceState("encrypting");
      const rawBytes = new Uint8Array(await audioBlob.arrayBuffer());
      const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedBytes = new Uint8Array(await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, rawBytes));
      const digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256", encryptedBytes));
      const attemptId = crypto.randomUUID();
      activeVoiceAttemptRef.current = attemptId;
      setVoiceState("preparing");
      setPreparingSeconds(0);
      preparationTimerRef.current = window.setInterval(() => setPreparingSeconds((seconds) => seconds + 1), 1000);
      voiceTimeoutRef.current = window.setTimeout(() => {
        if (activeVoiceAttemptRef.current === attemptId) {
          cancelVoicePreparation("Groq transcription exceeded the 55-second safety limit. No draft was sent to review; retry or type the statement instead.");
          toast.error("Groq transcription timed out. You can retry or type the statement instead.");
        }
      }, 55000);
      const supportedMimeTypes = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"] as const;
      const mimeType = supportedMimeTypes.includes(audioBlob.type as (typeof supportedMimeTypes)[number])
        ? audioBlob.type as (typeof supportedMimeTypes)[number]
        : "audio/webm";
      createVoiceComplaint.mutate({
        language,
        mimeType,
        rawAudioBase64: toBase64(rawBytes),
        encryptedAudioBase64: toBase64(encryptedBytes),
        ivBase64: toBase64(iv),
        ciphertextSha256: Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
        context,
      }, {
        onSuccess: ({ publicId }) => {
          if (activeVoiceAttemptRef.current !== attemptId) return;
          finishVoiceAttempt();
          setVoiceState("idle");
          if (audioPreviewUrl) retainLocalAudioReview(publicId, audioPreviewUrl);
          navigate(`/confirm/${publicId}`);
        },
        onError: (error) => {
          if (activeVoiceAttemptRef.current !== attemptId) return;
          finishVoiceAttempt();
          const message = userFacingGroqError(error.message);
          setVoiceState("failed");
          setVoiceError(message);
          toast.error(message);
        },
      });
    } catch (error) {
      finishVoiceAttempt();
      setVoiceState("failed");
      setVoiceError(error instanceof Error ? error.message : "The recording could not be encrypted locally.");
      toast.error("The recording could not be encrypted locally. Please retry or type the statement instead.");
    }
  };

  const copyResumeCode = async () => {
    if (!resumeCode || !navigator.clipboard?.writeText) {
      toast.message("Copying is unavailable in this browser. Keep the code visible and store it privately.");
      return;
    }
    try {
      await navigator.clipboard.writeText(resumeCode);
      toast.success("Resume code copied. Store it privately.");
    } catch {
      toast.error("The resume code could not be copied. Please select it and copy it manually.");
    }
  };
  const requestSourceCoverage = () => {
    if (!consent) {
      toast.message("Confirm consent before using the AI coverage preview.");
      return;
    }
    if (!sourceReadiness.isReady) {
      toast.message("Add a little more of your statement before asking for an AI coverage preview.");
      return;
    }
    setCoverageSource(sourceText);
    sourceCoverage.mutate({ language, sourceTranscript: sourceText });
  };
  const saveCurrentDraft = () => {
    if (!consent || sourceText.trim().length < 8) {
      toast.message("Add your statement and consent before saving a text intake.");
      return;
    }
    saveDraft.mutate({ language, sourceTranscript: sourceText, context, currentStep: activeStep + 1, consent: true, resumeCode: resumeCode ?? undefined });
  };
  const goForward = () => {
    if (activeStep === 1 && mode === "text" && sourceText.trim().length < 8) {
      toast.message("Please add your statement in your own words before continuing.");
      return;
    }
    if (activeStep === 1 && mode === "voice" && !audioBlob) {
      toast.message("Record your statement or choose the text option before continuing.");
      return;
    }
    if (activeStep === 2) {
      if (mode === "voice") void submitVoice();
      else if (!consent) toast.message("Please confirm consent before continuing.");
      else createComplaint.mutate({ language, sourceTranscript: sourceText, consent: true, context, resumeCode: resumeCode ?? undefined });
      return;
    }
    setActiveStep((current) => Math.min(2, current + 1));
  };

  const statementPanel = mode === "voice" ? (
    <div className="rounded-2xl border border-dashed border-[#c64e19]/45 bg-[#fff7f2] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`${recordingState === "recording" ? "soft-pulse" : ""} grid h-11 w-11 place-items-center rounded-full bg-[#c64e19] text-white`}><Mic className="h-5 w-5" /></span>
          <div>
            <h2 className="font-bold text-[#102643]">{recordingState === "recording" ? `Recording · ${recordingSeconds}s` : recordingState === "ready" ? "Recording ready to transcribe." : "Speak naturally in your own words."}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">For clearer words: use a quiet place, keep one speaker close to the microphone, and state names, places, dates, and numbers slowly.</p>
          </div>
        </div>
        {recordingState === "recording" ? (
          <button type="button" onClick={stopRecording} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white"><Square className="h-4 w-4" /> Stop</button>
        ) : (
          <button type="button" onClick={beginRecording} disabled={voiceState === "encrypting" || voiceState === "preparing"} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c64e19] px-4 text-sm font-bold text-white disabled:opacity-50">{recordingState === "ready" ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{recordingState === "ready" ? "Record again" : "Start recording"}</button>
        )}
      </div>
      {audioPreviewUrl && <div className="mt-4 rounded-xl border border-[#102643]/10 bg-white/80 p-3"><p className="flex items-center gap-2 text-xs font-bold text-[#102643]"><Headphones className="h-4 w-4 text-[#c64e19]" />Listen back before transcript check</p><audio controls preload="metadata" src={audioPreviewUrl} className="mt-3 h-9 w-full" aria-label="Recorded statement preview" /></div>}
      {recordingState === "recording" && <section className="mt-4 rounded-xl border border-[#102643]/10 bg-white/80 p-3" aria-label="Live microphone level"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#102643]">Live voice level</p><p className={`mt-1 text-xs leading-5 ${audioLevel.state === "silent" ? "text-amber-800" : audioLevel.state === "loud" ? "text-[#a83d10]" : "text-emerald-800"}`} aria-live="polite">{audioLevel.label}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${audioLevel.state === "silent" ? "bg-amber-500" : audioLevel.state === "loud" ? "bg-[#c64e19]" : "bg-emerald-500"}`} aria-hidden="true" /></div><div className="mt-3 flex h-9 items-end gap-1" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(audioLevel.level * 100)} aria-valuetext={audioLevel.label}>{Array.from({ length: 16 }, (_, index) => <span key={index} className={`w-full rounded-sm transition-transform duration-100 ${audioLevel.state === "loud" && index > 12 ? "bg-[#c64e19]" : audioLevel.state === "silent" ? "bg-amber-300" : "bg-emerald-500"}`} style={{ height: `${24 + ((index % 5) * 14)}%`, opacity: Math.max(0.16, audioLevel.level * 1.65 - index / 23) }} />)}</div><p className="mt-2 text-[11px] leading-5 text-slate-500">This meter reads the microphone locally for live feedback only. It does not store or transmit audio-level data.</p></section>}
      <GroqTranscriptionStatus state={voiceState} seconds={preparingSeconds} error={voiceError} languageLabel={selectedLanguage} onCancel={() => cancelVoicePreparation()} onRetry={() => { if (audioBlob) void submitVoice(); }} onTypeInstead={() => { if (activeVoiceAttemptRef.current) cancelVoicePreparation(); setMode("text"); }} />
    </div>
  ) : (
    <div className="rounded-2xl border border-[#102643]/12 bg-white p-4">
      <label htmlFor="source-text" className="text-sm font-bold text-[#102643]">Your statement, in your own words</label>
      <textarea id="source-text" value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={8} className="focus-ring mt-3 w-full resize-y rounded-xl border border-[#102643]/14 bg-[#fffefa] p-3 text-sm leading-6 text-[#102643] placeholder:text-slate-400" placeholder={`Tell us what happened. You can write in ${selectedLanguage}.`} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5">
        <p className="text-slate-500">Your original words are kept separate from any structured review aid.</p>
        <span className={`rounded-full px-2.5 py-1 font-bold ${sourceReadiness.isReady ? "bg-emerald-50 text-emerald-800" : "bg-[#f5f2eb] text-slate-600"}`}>{sourceReadiness.characterCount} characters · {sourceReadiness.wordCount} words {sourceReadiness.isReady ? "· ready to continue" : "· add a little more"}</span>
      </div>
      <div className="mt-4 border-t border-[#102643]/8 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-sm font-bold text-[#102643]"><BrainCircuit className="h-4 w-4 text-[#c64e19]" />AI source-coverage check</p><p className="mt-1 text-xs leading-5 text-slate-600">It only returns exact excerpts and fixed detail categories. It does not rewrite your statement.</p></div>
          <button type="button" onClick={requestSourceCoverage} disabled={!consent || !sourceReadiness.isReady || sourceCoverage.isPending} className="pressable focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#c64e19]/25 bg-[#fff7f2] px-3 text-xs font-bold text-[#a83d10] disabled:opacity-50">{sourceCoverage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}{sourceCoverage.isPending ? "Checking coverage…" : "Check coverage"}</button>
        </div>
        {!consent && <p className="mt-3 text-xs leading-5 text-slate-500">Confirm the prototype-processing consent below before requesting this optional AI check.</p>}
        {sourceCoverage.isPending && <div className="mt-3 rounded-xl bg-[#f5f2eb] p-3 text-xs font-semibold text-slate-600">Reading only the supplied source statement for coverage. No replacement record is being created.</div>}
        {coverage && <section className="mt-3 rounded-xl border border-[#c64e19]/18 bg-[#fffaf6] p-3" aria-live="polite"><p className="text-xs font-bold text-[#102643]">AI coverage result</p>{coverage.available ? <><div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Exact source excerpts found</p>{coverage.sourceQuotes.length ? <div className="mt-2 flex flex-wrap gap-2">{coverage.sourceQuotes.map((quote) => <q key={quote} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#102643] shadow-sm">{quote}</q>)}</div> : <p className="mt-1 text-xs leading-5 text-slate-600">No short exact excerpts were returned. Your source statement remains unchanged.</p>}</div><div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Categories that may need clarification</p>{coverage.potentialGaps.length ? <ul className="mt-2 flex flex-wrap gap-2">{coverage.potentialGaps.map((gap) => <li key={gap} className="rounded-full border border-[#c64e19]/15 bg-white px-2.5 py-1 text-xs font-medium text-[#8f360e]">{coverageLabels[gap]}</li>)}</ul> : <p className="mt-1 text-xs leading-5 text-slate-600">The AI did not surface one of the fixed categories. A constable still verifies every record.</p>}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">A possible gap is not a claim about what happened. It only helps keep later questions focused.</p></> : <p className="mt-2 text-xs leading-5 text-slate-600">The AI coverage check was unavailable. You can continue; your original words have not been changed.</p>}</section>}
      </div>
    </div>
  );

  const question = steps[activeStep];
  return <FirSaathiShell compact><main className="intake-workspace page-grid min-h-[calc(100vh-144px)] py-8 sm:py-12"><div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-8"><section className="workspace-panel rounded-[1.35rem] border border-[#102643]/10 bg-[#fbfaf6]/95 shadow-[0_22px_55px_rgba(12,32,57,.09)]"><div className="border-b border-[#102643]/10 px-5 py-5 sm:px-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Citizen intake</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#102643]">Your words first.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">After the transcript is checked, we ask only about important details that are still missing.</p></div><span className="status-chip shrink-0 rounded-full bg-[#fce9df] px-3 py-1.5 text-xs font-bold text-[#a83d10]">Step {activeStep + 1} of {steps.length}</span></div></div><div className="space-y-5 p-5 sm:p-7"><CitizenJourneyProgress stage="intake" question={question} compact />{restoredDraft.isFetching && <p className="flex items-center gap-2 rounded-xl bg-[#f5f2eb] p-3 text-xs font-semibold text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Restoring your saved intake…</p>}{activeStep === 0 && <section><p className="text-sm font-bold text-[#102643]">Which language would you like to use?</p><p className="mt-1 text-xs leading-5 text-slate-500">Choose the language yourself. It is never guessed from a short recording.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`option-card pressable focus-ring rounded-xl border p-3 text-left ${language === item.code ? "border-[#c64e19] bg-[#fff4ee] shadow-[0_5px_18px_rgba(198,78,25,.08)]" : "border-[#102643]/12 bg-white hover:border-[#102643]/25"}`} aria-pressed={language === item.code}><span className="flex items-center justify-between"><span className="text-sm font-bold">{item.label}</span>{language === item.code && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#c64e19] text-white"><Check className="h-3.5 w-3.5" /></span>}</span><span className="mt-1.5 block text-base font-medium text-slate-600" lang={item.code}>{item.native}</span></button>)}</div></section>}{activeStep === 1 && <section><p className="text-sm font-bold text-[#102643]">How would you like to share what happened?</p><div className="mt-4 inline-flex rounded-xl border border-[#102643]/12 bg-white p-1" role="group" aria-label="Statement entry mode"><button type="button" onClick={() => setMode("voice")} className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === "voice" ? "bg-[#102643] text-white" : "text-slate-600 hover:bg-[#f6f3ed]"}`}><Mic className="h-4 w-4" /> Voice</button><button type="button" onClick={() => { if (activeVoiceAttemptRef.current) cancelVoicePreparation(); setMode("text"); }} className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === "text" ? "bg-[#102643] text-white" : "text-slate-600 hover:bg-[#f6f3ed]"}`}><Keyboard className="h-4 w-4" /> Type</button></div><div className="mt-4">{statementPanel}</div><label className="mt-4 flex items-start gap-3 rounded-xl border border-[#102643]/10 bg-white/70 p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="focus-ring mt-0.5 h-4 w-4 rounded accent-[#c64e19]" /><span><span className="text-sm font-bold text-[#102643]">I understand and consent to this prototype processing my statement.</span><span className="mt-1 block text-xs leading-5 text-slate-600">Do not use this demo for an emergency, real police complaint, or sensitive evidence.</span></span></label></section>}{activeStep === 2 && <section><p className="text-sm font-bold text-[#102643]">Ready to check your transcript.</p><p className="mt-2 text-sm leading-6 text-slate-600">We will keep your words as the source record, identify only source-supported details, and ask any remaining high-value questions one at a time. You can skip every optional follow-up.</p><div className="mt-5 rounded-2xl border border-[#102643]/10 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Selected language</p><p className="mt-1 text-sm font-bold text-[#102643]">{selectedLanguage}</p><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Statement method</p><p className="mt-1 text-sm font-bold text-[#102643]">{mode === "voice" ? "Voice recording" : "Typed statement"}</p></div>{resumeCode && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><FileKey2 className="h-4 w-4" />Saved intake code</p><button type="button" onClick={() => void copyResumeCode()} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800"><Copy className="h-3.5 w-3.5" />Copy code</button></div><code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#102643]">{resumeCode}</code><p className="mt-2 text-xs leading-5 text-emerald-800">Keep this private. Anyone with it can reopen this saved intake.</p></div>}</section>}<div className="flex flex-col gap-3 border-t border-[#102643]/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div>{activeStep > 0 && <button type="button" onClick={() => setActiveStep((current) => Math.max(0, current - 1))} className="pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#102643]/14 bg-white px-4 text-sm font-bold text-[#102643]"><ChevronLeft className="h-4 w-4" /> Back</button>}</div><div className="flex flex-wrap items-center gap-2">{mode === "text" && activeStep >= 1 && <button type="button" onClick={saveCurrentDraft} disabled={saveDraft.isPending || !consent || sourceText.trim().length < 8} className="pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#102643]/14 bg-white px-4 text-sm font-bold text-[#102643] disabled:opacity-50">{saveDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileKey2 className="h-4 w-4" />} Save and continue later</button>}<button type="button" onClick={goForward} disabled={createComplaint.isPending || (mode === "voice" && (voiceState === "encrypting" || voiceState === "preparing"))} className="pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c64e19] px-4 text-sm font-bold text-white shadow-[0_10px_20px_rgba(198,78,25,.18)] hover:bg-[#a83d10] disabled:opacity-40">{createComplaint.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : activeStep === 2 ? "Check transcript" : "Continue"}<ChevronRight className="h-4 w-4" /></button></div></div></div></section><aside className="space-y-4"><section className="trust-panel rounded-2xl border border-[#102643]/10 bg-[#0c2039] p-5 text-white shadow-[0_16px_35px_rgba(12,32,57,.15)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f48a51]">Your protections</p><ul className="mt-5 space-y-4 text-sm leading-5 text-slate-200"><li className="flex gap-3"><FileText className="h-4 w-4 shrink-0 text-[#f48a51]" />Your spoken or typed words remain the source record.</li><li className="flex gap-3"><Volume2 className="h-4 w-4 shrink-0 text-[#f48a51]" />We check the transcript before asking an optional follow-up.</li><li className="flex gap-3"><CircleAlert className="h-4 w-4 shrink-0 text-[#f48a51]" />A constable verifies; this does not register an FIR.</li></ul></section><section className="resume-panel rounded-2xl border border-[#102643]/10 bg-white/80 p-5"><p className="text-sm font-bold text-[#102643]">Already saved an intake?</p><p className="mt-2 text-xs leading-5 text-slate-600">Use the private resume code you were shown.</p><Link href="/resume" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[#c64e19] hover:text-[#a83d10]"><FileKey2 className="h-4 w-4" /> Resume saved intake</Link></section></aside></div></main></FirSaathiShell>;
}
