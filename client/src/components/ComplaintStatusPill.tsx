import type { ComplaintStatus } from "../../../shared/firSaathi";

const labels: Record<ComplaintStatus, string> = {
  draft: "Draft",
  needs_citizen_confirmation: "Citizen confirmation needed",
  ready_for_review: "Ready for review",
  returned: "Returned for clarification",
  verified: "Verified prototype record",
};

const styles: Record<ComplaintStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  needs_citizen_confirmation: "bg-amber-100 text-amber-800",
  ready_for_review: "bg-[#fce9df] text-[#9b3a0d]",
  returned: "bg-slate-200 text-slate-700",
  verified: "bg-emerald-100 text-emerald-800",
};

export default function ComplaintStatusPill({ status }: { status: ComplaintStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}
