import { cn } from "@/lib/utils";

type FirSaathiMarkProps = { className?: string; title?: string };

export default function FirSaathiMark({ className, title = "FIR Saathi logo" }: FirSaathiMarkProps) {
  return <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn("shrink-0", className)} fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 4.5 53 12.2v16.2c0 13.9-8.6 25.6-21 31.1C19.6 54 11 42.3 11 28.4V12.2L32 4.5Z" stroke="#102643" strokeWidth="4.8" strokeLinejoin="round" /><path d="M39.5 20.3c-4.9-4-11.5-3.7-15.2.3-4 4.5-2.7 9.4 5.3 11.5 7.4 1.9 12.3 4.6 10.5 11.5-1.2 4.6-6 7.3-11.2 6.3-3.6-.7-6.1-2.6-7.4-5.6m3.5 7.2-4.4 2.8m20.2-28.3c1.4 2 1.9 4.4 1.4 7" stroke="#C64E19" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M24.8 14.9c4.1-3.2 10.3-3.2 14.4 0M27.5 18.4c2.6-1.9 6.4-1.9 9 0M30.2 21.6c1.1-.8 2.5-.8 3.6 0" stroke="#C64E19" strokeWidth="3.2" strokeLinecap="round" /></svg>;
}
