import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Headphones, Languages, LockKeyhole, Mic, ShieldAlert, Sparkles, UserRoundCheck } from "lucide-react";
import FirSaathiShell from "@/components/FirSaathiShell";

const principles = [
  { icon: Languages, title: "Her language, retained", text: "The source statement is kept in the language selected by the citizen—never silently translated or formalised." },
  { icon: Headphones, title: "Read back before review", text: "A citizen can hear the drafted account before it leaves the intake flow, including without reading it." },
  { icon: UserRoundCheck, title: "Human authority remains", text: "A constable corrects and verifies. The prototype does not register an FIR or decide the law." },
];

const flow = [
  ["01", "Speak or type", "Select English, Hindi, or Gujarati. Record with consent or use the text fallback."],
  ["02", "Check the draft", "The assistant extracts details, flags gaps, and asks only for missing material information."],
  ["03", "Hear it back", "The citizen reviews and explicitly confirms the draft before it reaches the constable."],
  ["04", "Verify, never register", "The constable checks corrections and suggested references before verifying the prototype record."],
];

export default function Home() {
  return (
    <FirSaathiShell dark>
      <main>
        <section className="navy-surface relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:gap-16 lg:pb-28 lg:pt-24">
            <div className="max-w-3xl">
              <div className="fade-up inline-flex items-center gap-2 rounded-full border border-[#f7b28c]/25 bg-[#c64e19]/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[#ffd5c0]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Voice-first citizen intake
              </div>
              <h1 className="fade-up mt-6 text-balance text-5xl font-bold tracking-[-0.058em] text-white sm:text-6xl lg:text-7xl">Her words.<br /><span className="text-[#f48a51]">Her language.</span><br />On the record.</h1>
              <p className="fade-up-delay mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">FIR Saathi is a human-verified complaint drafting and read-back prototype designed to reduce what gets lost between a citizen’s account and the page.</p>
              <div className="fade-up-delay mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/intake" className="pressable focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c64e19] px-5 text-sm font-bold text-white shadow-[0_13px_35px_rgba(198,78,25,0.28)] hover:bg-[#da5b22]">
                  Start citizen intake <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/officer" className="pressable focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-sm font-bold text-white hover:bg-white/[0.12]">
                  Open constable workspace
                </Link>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f48a51]" aria-hidden="true" /> This is a demonstration prototype. It is not an emergency service and does not register an FIR.</p>
            </div>

            <div className="fade-up rounded-[1.4rem] border border-white/12 bg-[#081829]/75 p-4 shadow-[0_28px_80px_rgba(0,0,0,.32)] backdrop-blur-xl sm:p-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Citizen record</p><p className="mt-1 text-sm font-bold text-white">Source transcript</p></div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c64e19]/15 px-2.5 py-1 text-[11px] font-bold text-[#ffc2a4]"><Mic className="h-3 w-3" /> Gujarati</span>
                </div>
                <p lang="gu" className="mt-6 border-l-2 border-[#f48a51] pl-4 text-base leading-8 text-slate-100">મને ગઈકાલે સાંજે રસ્તા પર બે લોકોએ રોકી મારી ચેન લઈ લીધી. નજીકમાં દુકાનદાર હતા.</p>
                <div className="mt-5 flex items-center gap-1.5" aria-label="Example audio waveform">
                  {[18, 31, 53, 74, 42, 87, 56, 34, 67, 92, 45, 62, 35, 73, 48, 28, 59, 84, 40, 22, 64, 47, 31, 56].map((height, index) => <span key={index} className="w-1 flex-1 rounded-full bg-[#f48a51]" style={{ height: `${height / 4}px`, opacity: index > 16 ? 0.45 : 0.95 }} />)}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.06] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Missing detail</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-200">When exactly did this happen?</p></div>
                  <div className="rounded-xl bg-[#c64e19]/12 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#f4a77f]">Human checkpoint</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-100">Citizen read-back needed</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="paper-noise text-[#102643]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c64e19]">Built around restraint</p><h2 className="mt-4 max-w-sm text-4xl font-bold tracking-[-0.048em] sm:text-5xl">The record stays with the citizen.</h2></div>
              <div className="grid gap-4 md:grid-cols-3">
                {principles.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#102643]/10 bg-white/70 p-5 shadow-[0_12px_25px_rgba(12,32,57,.045)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fce9df] text-[#c64e19]"><Icon className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-lg font-bold tracking-[-0.025em]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ede6] text-[#102643]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c64e19]">The supported path</p><h2 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Four steps. Two human checks.</h2></div><div className="inline-flex items-center gap-2 rounded-full border border-[#102643]/10 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600"><BadgeCheck className="h-4 w-4 text-[#c64e19]" /> AI informs; people decide.</div></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {flow.map(([number, title, text], index) => <article key={number} className={`rounded-2xl border p-5 ${index === 2 || index === 3 ? "border-[#c64e19]/25 bg-[#fff5ef]" : "border-[#102643]/10 bg-white/70"}`}><p className="text-xs font-bold tracking-[0.18em] text-[#c64e19]">{number}</p><h3 className="mt-9 text-lg font-bold tracking-[-0.025em]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>{(index === 2 || index === 3) && <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#c64e19]">Human checkpoint</p>}</article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#0a1a2e] px-5 py-16 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-7 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f48a51]">Privacy and legal boundary</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">This prototype prepares a verified draft. It does not register an FIR.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Suggested BNS references are demonstrative only. Never use this experience for urgent reports, legal advice, or real sensitive evidence.</p></div><Link href="/intake" className="pressable focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#102643] hover:bg-[#fff7f2]">Explore the demo <ArrowRight className="h-4 w-4" /></Link></div>
        </section>
      </main>
    </FirSaathiShell>
  );
}
