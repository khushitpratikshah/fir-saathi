import { Link, useLocation } from "wouter";
import { ClipboardPenLine, Moon, ShieldCheck, Sun } from "lucide-react";
import { useLayoutEffect, useRef, type PropsWithChildren } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/_core/hooks/useAuth";
import FirSaathiMark from "@/components/FirSaathiMark";

type ShellProps = PropsWithChildren<{
  dark?: boolean;
  compact?: boolean;
  showcase?: boolean;
  officerTheme?: { dark: boolean; toggle: () => void };
}>;

const navItems = [
  { href: "/process", label: "How it works" },
  { href: "/demo", label: "Judge guide" },
  { href: "/intake", label: "Citizen intake" },
  { href: "/officer", label: "Constable review" },
];

gsap.registerPlugin(ScrollTrigger);

export default function FirSaathiShell({ children, dark = false, compact = false, showcase = false, officerTheme }: ShellProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const items = user?.role === "admin" ? [...navItems, { href: "/admin", label: "Admin" }] : navItems;
  const shellRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!shellRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const stage = shellRef.current?.querySelector<HTMLElement>(".app-stage");
      const header = shellRef.current?.querySelector<HTMLElement>(".site-header");
      if (header) gsap.fromTo(header, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.52, ease: "power3.out", clearProps: "transform,opacity" });
      if (stage) {
        const hero = stage.querySelector(".navy-surface");
        if (hero) {
          gsap.fromTo(stage, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.48, ease: "power3.out", clearProps: "transform,opacity" });
          gsap.from(hero.querySelectorAll(".fade-up"), { y: 32, opacity: 0, duration: 0.7, ease: "power4.out", stagger: 0.1, clearProps: "transform,opacity" });
          gsap.from(hero.querySelectorAll(".fade-up-delay"), { y: 24, opacity: 0, duration: 0.64, delay: 0.18, ease: "power3.out", stagger: 0.1, clearProps: "transform,opacity" });
          gsap.from(hero.querySelectorAll(".impact-orbit"), { y: 28, scale: 0.96, opacity: 0, duration: 0.9, delay: 0.14, ease: "power4.out", clearProps: "transform,opacity" });
          if (showcase) gsap.to(hero.querySelectorAll(".impact-orbit"), { y: -7, duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
          gsap.utils.toArray<HTMLElement>(stage.querySelectorAll(".paper-noise article, .paper-noise + section article")).forEach((card) => {
            gsap.from(card, { y: 22, opacity: 0, duration: 0.52, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 88%", once: true }, clearProps: "transform,opacity" });
          });
        } else {
          const workspaceItems = stage.querySelectorAll<HTMLElement>(".workspace-panel, .trust-panel, .resume-panel, main > div > section, main > div > aside");
          gsap.from(workspaceItems, { y: 10, duration: 0.32, ease: "power3.out", stagger: 0.045, clearProps: "transform" });
        }
      }
    }, shellRef);
    return () => ctx.revert();
  }, [location, showcase]);

  return (
    <div ref={shellRef} className={dark ? "min-h-screen bg-[#071525] text-white" : "min-h-screen paper-noise text-[#102643]"}>
      <header className={`site-header sticky top-0 z-30 border-b ${dark ? "border-white/10 bg-[#071525]/88" : "border-[#102643]/10 bg-[#fbfaf6]/88"} backdrop-blur-xl`}>
        <div className={`mx-auto flex h-[72px] items-center justify-between px-5 sm:px-8 ${compact ? "max-w-6xl" : "max-w-7xl"}`}>
          <Link href="/" className="focus-ring inline-flex items-center gap-3 rounded-lg">
            <span className={`brand-mark grid h-9 w-9 place-items-center rounded-xl p-1.5 shadow-[0_7px_18px_rgba(198,78,25,0.18)] ${dark ? "bg-white/95" : "bg-[#fff7f1]"}`}><FirSaathiMark className="h-full w-full" /></span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-[-0.02em]">FIR Saathi</span>
              <span className={`brand-kicker block text-[10px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-slate-400" : "text-slate-500"}`}>{showcase ? "Intel AI Impact Fest" : "Citizen complaint workspace"}</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="site-nav hidden items-center gap-1 sm:flex">
            {items.map((item) => {
              const active = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`site-nav-link focus-ring rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? (dark ? "bg-white/10 text-white" : "bg-[#102643] text-white") : dark ? "text-slate-300 hover:bg-white/7 hover:text-white" : "text-slate-600 hover:bg-white hover:text-[#102643]"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
          {user && <button type="button" onClick={() => void logout()} className={`focus-ring hidden rounded-full border px-3 py-1.5 text-xs font-bold sm:inline-flex ${dark ? "border-white/10 text-slate-200" : "border-[#102643]/10 text-slate-600"}`}>Sign out</button>}
          {officerTheme && <button type="button" onClick={officerTheme.toggle} className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${dark ? "border-white/10 bg-white/5 text-slate-200" : "border-[#102643]/10 bg-white/70 text-slate-600"}`} aria-label="Toggle constable workspace theme">{officerTheme.dark ? <Sun className="h-3.5 w-3.5 text-[#f48a51]" /> : <Moon className="h-3.5 w-3.5 text-[#102643]" />}{officerTheme.dark ? "Light" : "Dark"}</button>}
          <div className={`verification-chip hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold md:flex ${dark ? "border-white/10 bg-white/5 text-slate-300" : "border-[#102643]/10 bg-white/70 text-slate-600"}`}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#c64e19]" aria-hidden="true" />
            Human verification required
          </div>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="mobile-site-nav sm:hidden">
          <div className={`mobile-site-nav-inner mx-auto ${compact ? "max-w-6xl" : "max-w-7xl"}`}>
            {items.map((item) => {
              const active = location === item.href || location.startsWith(`${item.href}/`);
              return <Link key={item.href} href={item.href} data-active={active} className="mobile-site-nav-link focus-ring">{item.label}</Link>;
            })}
          </div>
        </nav>
      </header>
      <div className={`app-stage ${showcase ? "app-stage-showcase" : "app-stage-workspace"}`}>{children}</div>
      <footer className={`border-t ${dark ? "border-white/10 bg-[#061222] text-slate-400" : "border-[#102643]/10 bg-white/45 text-slate-500"}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2"><ClipboardPenLine className="h-3.5 w-3.5 text-[#c64e19]" aria-hidden="true" /> FIR Saathi drafts and verifies; it does not register an FIR.</div>
          <div className="font-medium">Prototype only · Do not submit real or urgent complaints here.</div>
        </div>
      </footer>
    </div>
  );
}
