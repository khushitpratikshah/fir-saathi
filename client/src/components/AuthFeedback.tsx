import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";

export function AuthFeedback({ kind, message }: { kind: "loading" | "success" | "error"; message: string }) {
  const icon = kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />;
  const colors = kind === "loading" ? "border-[#102643]/12 bg-[#f5f2eb] text-[#102643]" : kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-[#c64e19]/25 bg-[#fff5ef] text-[#8f360e]";
  return <div role={kind === "error" ? "alert" : "status"} aria-live="polite" className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-3 text-left text-xs leading-5 ${colors}`}>{icon}<p>{message}</p></div>;
}
