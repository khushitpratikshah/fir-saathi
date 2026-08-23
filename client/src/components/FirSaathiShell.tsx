import { Link, useLocation } from "wouter";
import { ClipboardPenLine, ShieldCheck } from "lucide-react";
import type { PropsWithChildren } from "react";

type ShellProps = PropsWithChildren<{
  dark?: boolean;
  compact?: boolean;
}>;

const navItems = [
  { href: "/impact-demo", label: "Guided story" },
  { href: "/intake", label: "Citizen intake" },
  { href: "/officer", label: "Constable review" },
];

export default function FirSaathiShell({ children, dark = false, compact = false }: ShellProps) {
  const [location] = useLocation();

  return (
    <div className={dark ? "min-h-screen bg-[#071525] text-white" : "min-h-screen paper-noise text-[#102643]"}>
      <header className={`relative z-10 border-b ${dark ? "border-white/10 bg-[#071525]/80" : "border-[#102643]/10 bg-[#fbfaf6]/80"} backdrop-blur-xl`}>
        <div className={`mx-auto flex h-[72px] items-center justify-between px-5 sm:px-8 ${compact ? "max-w-6xl" : "max-w-7xl"}`}>
          <Link href="/" className="focus-ring inline-flex items-center gap-3 rounded-lg">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c64e19] text-xs font-bold tracking-[-0.05em] text-white shadow-[0_7px_18px_rgba(198,78,25,0.28)]">FS</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-[-0.02em]">FIR Saathi</span>
              <span className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-slate-400" : "text-slate-500"}`}>Impact Fest showcase</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`focus-ring rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? (dark ? "bg-white/10 text-white" : "bg-[#102643] text-white") : dark ? "text-slate-300 hover:bg-white/7 hover:text-white" : "text-slate-600 hover:bg-white hover:text-[#102643]"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold md:flex ${dark ? "border-white/10 bg-white/5 text-slate-300" : "border-[#102643]/10 bg-white/70 text-slate-600"}`}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#c64e19]" aria-hidden="true" />
            Human verification required
          </div>
        </div>
      </header>
      {children}
      <footer className={`border-t ${dark ? "border-white/10 text-slate-400" : "border-[#102643]/10 text-slate-500"}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2"><ClipboardPenLine className="h-3.5 w-3.5 text-[#c64e19]" aria-hidden="true" /> FIR Saathi drafts and verifies; it does not register an FIR.</div>
          <div>Prototype only · Do not submit real or urgent complaints here.</div>
        </div>
      </footer>
    </div>
  );
}
