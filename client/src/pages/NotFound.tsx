import { Link } from "wouter";
import FirSaathiShell from "@/components/FirSaathiShell";

export default function NotFound() {
  return <FirSaathiShell><main className="grid min-h-[calc(100vh-144px)] place-items-center px-5"><div className="max-w-md text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c64e19]">Page not found</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] text-[#102643]">This route is not part of the prototype.</h1><p className="mt-4 text-sm leading-6 text-slate-600">Return to the FIR Saathi workspace to begin a demo citizen intake or constable review.</p><Link href="/" className="focus-ring mt-7 inline-flex rounded-xl bg-[#102643] px-4 py-3 text-sm font-bold text-white">Return home</Link></div></main></FirSaathiShell>;
}
