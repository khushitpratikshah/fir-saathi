import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Check, ChevronRight, CircleAlert, FileText, Keyboard, Loader2, Mic, Play, RotateCcw, ShieldCheck, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import FirSaathiShell from "@/components/FirSaathiShell";
import GroqTranscriptionStatus from "@/components/GroqTranscriptionStatus";
import { trpc } from "@/lib/trpc";
import { userFacingGroqError } from "@/lib/groqTranscription";

const languages = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
] as const;

type Language = (typeof languages)[number]["code"];
type VoiceState = "idle" | "encrypting" | "preparing" | "failed";

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
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "ready">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [preparingSeconds, setPreparingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const preparationTimerRef = useRef<number | null>(null);
  const voiceTimeoutRef = useRef<number | null>(null);
  const activeVoiceAttemptRef = useRef<string | null>(null);
  const [, navigate] = useLocation();
  const createComplaint = trpc.complaints.create.useMutation({ onSuccess: ({ publicId }) => navigate(`/confirm/${publicId}`), onError: (error) => toast.error(error.message) });
  const createVoiceComplaint = trpc.evidence.captureAndTranscribe.useMutation();
  const selectedLanguage = languages.find((item) => item.code === language)?.label ?? "selected language";

  const clearRecordingTimer = () => { if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; } };
  const clearPreparationTimers = () => {
    if (preparationTimerRef.current) { window.clearInterval(preparationTimerRef.current); preparationTimerRef.current = null; }
    if (voiceTimeoutRef.current) { window.clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
  };
  const finishVoiceAttempt = () => { activeVoiceAttemptRef.current = null; clearPreparationTimers(); };
  const cancelVoicePreparation = (message = "Transcription was cancelled. The recording remains on this page, so you can retry or type your statement instead.") => {
    finishVoiceAttempt();
    createVoiceComplaint.reset();
    setVoiceState("failed");
    setVoiceError(message);
  };

  useEffect(() => () => {
    clearRecordingTimer();
    clearPreparationTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const beginRecording = async () => {
    if (!consent) { toast.message("Please confirm consent before starting the microphone."); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast.error("This browser does not support audio capture. Please use the accessible text option."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined);
      chunksRef.current = [];
      setVoiceError(null);
      setVoiceState("idle");
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || mimeType }));
        setRecordingState("ready");
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        clearRecordingTimer();
      };
      recorder.start(1_000);
      setAudioBlob(null);
      setRecordingSeconds(0);
      setRecordingState("recording");
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1_000);
    } catch (error) {
      toast.error(error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone permission was not granted. You can use the text option instead." : "The microphone could not be started. Please use the text option instead.");
    }
  };

  const stopRecording = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); };

  const submitVoice = async () => {
    if (!audioBlob) { toast.error("Record a statement before continuing."); return; }
    if (audioBlob.size > 12 * 1024 * 1024) { toast.error("For this prototype, choose a recording smaller than 12 MB or use text input."); return; }
    if (!window.crypto?.subtle) { toast.error("This browser cannot encrypt the recording locally. Please use the text option."); return; }
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
      preparationTimerRef.current = window.setInterval(() => setPreparingSeconds((seconds) => seconds + 1), 1_000);
      voiceTimeoutRef.current = window.setTimeout(() => {
        if (activeVoiceAttemptRef.current === attemptId) {
          cancelVoicePreparation("Groq transcription exceeded the 55-second safety limit. No draft was sent to review; retry or type the statement instead.");
          toast.error("Groq transcription timed out. You can retry or type the statement instead.");
        }
      }, 55_000);
      const supportedMimeTypes = ["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"] as const;
      const mimeType = supportedMimeTypes.includes(audioBlob.type as (typeof supportedMimeTypes)[number]) ? audioBlob.type as (typeof supportedMimeTypes)[number] : "audio/webm";
      createVoiceComplaint.mutate({ language, mimeType, rawAudioBase64: toBase64(rawBytes), encryptedAudioBase64: toBase64(encryptedBytes), ivBase64: toBase64(iv), ciphertextSha256: Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join("") }, {
        onSuccess: ({ publicId }) => {
          if (activeVoiceAttemptRef.current !== attemptId) return;
          finishVoiceAttempt();
          setVoiceState("idle");
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
      const message = error instanceof Error ? error.message : "The recording could not be encrypted locally.";
      setVoiceState("failed");
      setVoiceError(message);
      toast.error("The recording could not be encrypted locally. Please retry or type the statement instead.");
    }
  };

  const continueIntake = () => {
    if (mode === "voice") { void submitVoice(); return; }
    createComplaint.mutate({ language, sourceTranscript: sourceText, consent: true });
  };

  return <FirSaathiShell compact><main className="page-grid min-h-[calc(100vh-144px)] py-8 sm:py-12"><div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-8"><section className="rounded-[1.35rem] border border-[#102643]/10 bg-[#fbfaf6]/95 shadow-[0_22px_55px_rgba(12,32,57,.09)]"><div className="border-b border-[#102643]/10 px-5 py-5 sm:px-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Citizen intake</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.045em]">Tell us what happened.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Speak naturally or type in your own words. This prototype preserves your source statement and will never register an FIR.</p></div><span className="hidden shrink-0 rounded-full bg-[#fce9df] px-3 py-1.5 text-xs font-bold text-[#a83d10] sm:block">Step 1 of 4</span></div></div><div className="space-y-8 p-5 sm:p-7"><fieldset><legend className="text-sm font-bold text-[#102643]">1. Choose the language you want to use</legend><p className="mt-1 text-xs leading-5 text-slate-500">Language is selected explicitly; it is never guessed from a short recording.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`pressable focus-ring rounded-xl border p-4 text-left ${language === item.code ? "border-[#c64e19] bg-[#fff4ee] shadow-[0_5px_18px_rgba(198,78,25,.08)]" : "border-[#102643]/12 bg-white hover:border-[#102643]/25"}`} aria-pressed={language === item.code}><span className="flex items-center justify-between"><span className="text-sm font-bold">{item.label}</span>{language === item.code && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#c64e19] text-white"><Check className="h-3.5 w-3.5" /></span>}</span><span className="mt-2 block text-lg font-medium text-slate-600" lang={item.code}>{item.native}</span></button>)}</div></fieldset><fieldset><legend className="text-sm font-bold text-[#102643]">2. Choose how you want to share your statement</legend><div className="mt-4 inline-flex rounded-xl border border-[#102643]/12 bg-white p-1" role="group" aria-label="Statement entry mode"><button type="button" onClick={() => setMode("voice")} className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === "voice" ? "bg-[#102643] text-white" : "text-slate-600 hover:bg-[#f6f3ed]"}`}><Mic className="h-4 w-4" /> Voice</button><button type="button" onClick={() => { if (activeVoiceAttemptRef.current) cancelVoicePreparation(); setMode("text"); }} className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${mode === "text" ? "bg-[#102643] text-white" : "text-slate-600 hover:bg-[#f6f3ed]"}`}><Keyboard className="h-4 w-4" /> Type instead</button></div>{mode === "voice" ? <div className="mt-4 rounded-2xl border border-dashed border-[#c64e19]/45 bg-[#fff7f2] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className={`${recordingState === "recording" ? "soft-pulse" : ""} grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c64e19] text-white`}><Mic className="h-5 w-5" /></span><div><h3 className="font-bold">{recordingState === "recording" ? `Recording · ${recordingSeconds}s` : recordingState === "ready" ? "Recording ready to transcribe." : "Recording is ready when you are."}</h3><p className="mt-1 text-sm leading-5 text-slate-600">The recording is encrypted in this browser before evidence metadata is stored.</p></div></div>{recordingState === "recording" ? <button type="button" onClick={stopRecording} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white"><Square className="h-4 w-4" /> Stop recording</button> : <button type="button" onClick={beginRecording} disabled={voiceState === "encrypting" || voiceState === "preparing"} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c64e19] px-4 text-sm font-bold text-white hover:bg-[#da5b22] disabled:opacity-50">{recordingState === "ready" ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{recordingState === "ready" ? "Record again" : "Start recording"}</button>}</div><div className="mt-5 flex items-center gap-1.5" aria-hidden="true">{[22,41,65,29,86,47,34,72,54,93,39,61,25,77,48,35,58,80,43,24,70,50,32,64,38,57,22,46].map((n, i) => <span key={i} className="h-[2px] flex-1 rounded-full bg-[#c64e19]" style={{ transform: `scaleY(${recordingState === "recording" ? n / 24 : n / 44})`, transformOrigin: "center", opacity: recordingState === "recording" ? 1 : 0.45 }} />)}</div>{recordingState === "ready" && <p className="mt-4 text-xs leading-5 text-slate-600">Recording size: {(audioBlob?.size ?? 0).toLocaleString()} bytes. Continue to encrypt, transcribe, and create the source record.</p>}<GroqTranscriptionStatus state={voiceState} seconds={preparingSeconds} error={voiceError} languageLabel={selectedLanguage} onCancel={() => cancelVoicePreparation()} onRetry={() => { if (audioBlob) void submitVoice(); }} onTypeInstead={() => { if (activeVoiceAttemptRef.current) cancelVoicePreparation(); setMode("text"); }} /></div> : <div className="mt-4 rounded-2xl border border-[#102643]/12 bg-white p-4"><label htmlFor="source-text" className="text-sm font-bold">Your statement, in your own words</label><textarea id="source-text" value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={7} className="focus-ring mt-3 w-full resize-y rounded-xl border border-[#102643]/14 bg-[#fffefa] p-3 text-sm leading-6 text-[#102643] placeholder:text-slate-400" placeholder="Tell us what happened. You can write in English, Hindi, or Gujarati." /><p className="mt-2 text-xs leading-5 text-slate-500">We will show your original source statement separately from any structured draft.</p></div>}</fieldset><label className="flex items-start gap-3 rounded-xl border border-[#102643]/10 bg-white/70 p-4"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="focus-ring mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#c64e19]" /><span><span className="text-sm font-bold">I understand and consent to this prototype processing my statement.</span><span className="mt-1 block text-xs leading-5 text-slate-600">Do not use this demo for an emergency, real police complaint, or sensitive evidence. Any audio is only handled for the prototype workflow.</span></span></label><div className="flex flex-col gap-3 border-t border-[#102643]/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803d]" /> The next step checks for missing details—it does not change your source statement.</p><button type="button" onClick={continueIntake} disabled={!consent || (mode === "text" && sourceText.trim().length < 8) || (mode === "voice" && (!audioBlob || voiceState === "encrypting" || voiceState === "preparing")) || createComplaint.isPending} className="pressable focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102643] px-4 text-sm font-bold text-white disabled:opacity-40"><span>{createComplaint.isPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing source record…</span> : "Continue to transcript"}</span><ChevronRight className="h-4 w-4" /></button></div></div></section><aside className="space-y-4"><section className="rounded-2xl border border-[#102643]/10 bg-[#0c2039] p-5 text-white shadow-[0_16px_35px_rgba(12,32,57,.15)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f48a51]">Your protections</p><ul className="mt-5 space-y-4 text-sm leading-5 text-slate-200"><li className="flex gap-3"><FileText className="h-4 w-4 shrink-0 text-[#f48a51]" />Your spoken or typed words remain the source record.</li><li className="flex gap-3"><Volume2 className="h-4 w-4 shrink-0 text-[#f48a51]" />You hear the draft before you choose to send it for review.</li><li className="flex gap-3"><CircleAlert className="h-4 w-4 shrink-0 text-[#f48a51]" />A constable must verify; this experience does not register an FIR.</li></ul></section><section className="rounded-2xl border border-[#102643]/10 bg-white/80 p-5"><div className="flex items-center gap-2 text-sm font-bold"><Play className="h-4 w-4 text-[#c64e19]" /> What happens next</div><ol className="mt-4 space-y-3 text-xs leading-5 text-slate-600"><li><b className="text-[#102643]">2.</b> Review the source transcript and any follow-up question.</li><li><b className="text-[#102643]">3.</b> Listen to the read-back and confirm explicitly.</li><li><b className="text-[#102643]">4.</b> A constable reviews, corrects or returns the draft.</li></ol></section></aside></div></main></FirSaathiShell>;
}
