export const SUPPORTED_LANGUAGES = ["en", "hi", "gu"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const COMPLAINT_STATUSES = [
  "draft",
  "needs_citizen_confirmation",
  "ready_for_review",
  "returned",
  "verified",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const DEMO_BNS_REFERENCES = [
  {
    sectionCode: "BNS 304",
    title: "Snatching",
    summary: "Demonstrative reference only. Verify against the official statute before relying on any section.",
    sourceLabel: "Prototype allow-list derived from the supplied FIR Saathi brief",
    verificationStatus: "demo_only" as const,
  },
  {
    sectionCode: "BNS 115",
    title: "Voluntarily causing hurt",
    summary: "Demonstrative reference only. Verify against the official statute before relying on any section.",
    sourceLabel: "Prototype allow-list derived from the supplied FIR Saathi brief",
    verificationStatus: "demo_only" as const,
  },
  {
    sectionCode: "BNS 309",
    title: "Robbery",
    summary: "Demonstrative reference only. Verify against the official statute before relying on any section.",
    sourceLabel: "Prototype allow-list derived from the supplied FIR Saathi brief",
    verificationStatus: "demo_only" as const,
  },
] as const;

export type DraftField = {
  key: string;
  label: string;
  value: string;
  sourceQuote?: string;
  required: boolean;
  source: "source_statement" | "officer_correction" | "assistant_draft";
  confidence: "high" | "medium" | "low" | "manual";
};

export type BnsSuggestion = {
  sectionCode: string;
  title: string;
  confidence: "high" | "medium" | "review";
  rationale: string;
};

export type StructuredDraft = {
  fields: DraftField[];
  missingDetails: string[];
  followUpQuestions: string[];
  bnsSuggestions: BnsSuggestion[];
  sourcePreservationNote: string;
};

export const EMPTY_DRAFT: StructuredDraft = {
  fields: [],
  missingDetails: [],
  followUpQuestions: [],
  bnsSuggestions: [],
  sourcePreservationNote: "The source statement is preserved as entered. The assistant may only identify missing details and ask follow-up questions.",
};
