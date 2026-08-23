export const SUPPORTED_LANGUAGES = ["en", "hi", "gu", "mr", "bn", "ta", "te", "kn", "ml", "pa"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const CITIZEN_CONTEXT_KEYS = ["incident_when", "incident_where", "people_or_vehicle", "property_or_loss", "injury_or_safety", "follow_up_contact"] as const;
export type CitizenContextKey = (typeof CITIZEN_CONTEXT_KEYS)[number];
export type CitizenContext = Partial<Record<CitizenContextKey, string>>;

export const INTAKE_DRAFT_EXPIRY_HOURS = 72;
export const GUIDED_INTAKE_STEPS = ["language", "statement", "when", "where", "safety", "details", "review"] as const;
export type GuidedIntakeStep = (typeof GUIDED_INTAKE_STEPS)[number];

export type ResumableIntakeDraft = {
  language: SupportedLanguage;
  sourceTranscript: string;
  context: CitizenContext;
  currentStep: number;
  expiresAt: Date;
};

export const COMPLAINT_STATUSES = [
  "draft",
  "needs_citizen_confirmation",
  "ready_for_review",
  "returned",
  "verified",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const BNS_REVIEW_REFERENCES = [
  {
    sectionCode: "BNS 115",
    title: "Voluntarily causing hurt",
    summary: "Possible-match review aid only. The source must describe an act and resulting hurt; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["an act or conduct is described", "hurt or bodily injury is described"],
    verificationStatus: "verified" as const,
  },
  {
    sectionCode: "BNS 303",
    title: "Theft",
    summary: "Possible-match review aid only. The source must describe movable property being taken without consent; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["movable property is identified", "taking without consent is described"],
    verificationStatus: "verified" as const,
  },
  {
    sectionCode: "BNS 304",
    title: "Snatching",
    summary: "Possible-match review aid only. The source must describe sudden, quick, or forcible taking from a person or their possession; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["movable property is identified", "sudden, quick, or forcible taking is described", "taking from a person or possession is described"],
    verificationStatus: "verified" as const,
  },
  {
    sectionCode: "BNS 308",
    title: "Extortion",
    summary: "Possible-match review aid only. The source must describe fear of injury and delivery of property or a valuable security; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["threat or fear of injury is described", "delivery of property or valuable security is described"],
    verificationStatus: "verified" as const,
  },
  {
    sectionCode: "BNS 309",
    title: "Robbery",
    summary: "Possible-match review aid only. The source must describe theft or extortion together with the relevant immediate force, hurt, restraint, or fear; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["property taking or delivery is described", "force, hurt, restraint, or immediate fear is described"],
    verificationStatus: "verified" as const,
  },
  {
    sectionCode: "BNS 351",
    title: "Criminal intimidation",
    summary: "Possible-match review aid only. The source must describe a threat of injury; a constable must assess all facts and legal requirements.",
    sourceLabel: "The Bharatiya Nyaya Sanhita, 2023, official gazette text",
    sourceUrl: "https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
    reviewedAt: "2026-08-23",
    eligibilityIndicators: ["a threat is described", "the threatened injury is described"],
    verificationStatus: "verified" as const,
  },
] as const;
export type BnsReviewReference = (typeof BNS_REVIEW_REFERENCES)[number];

export type DraftField = {
  key: string;
  label: string;
  value: string;
  sourceQuote?: string;
  required: boolean;
  source: "source_statement" | "officer_correction" | "assistant_draft" | "citizen_context";
  confidence: "high" | "medium" | "low" | "manual";
};

export type BnsSuggestion = {
  sectionCode: string;
  title: string;
  confidence: "high" | "medium" | "review";
  rationale: string;
  sourceQuotes: string[];
  missingFactors: string[];
  suitability: "possible_match" | "needs_officer_assessment" | "officer_review";
  sourceUrl?: string;
  reviewedAt?: string;
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
