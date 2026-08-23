import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { BNS_REVIEW_REFERENCES, EMPTY_DRAFT, INTAKE_DRAFT_EXPIRY_HOURS, type BnsSuggestion, type CitizenContext, type ComplaintStatus, type DraftField, type ResumableIntakeDraft, type StructuredDraft, type SupportedLanguage } from "../shared/firSaathi";
import { generateSafeDraft } from "./drafting";
import { groqTranscribe } from "./groqProvider";
import { portableEvidencePut, portableEvidenceSignedUrl } from "./portableStorage";
import { supabaseRequest } from "./supabase";

type SupabaseComplaint = {
  id: string;
  public_id: string;
  language: SupportedLanguage;
  status: ComplaintStatus;
  consent_at: string | null;
  citizen_confirmed_at: string | null;
  source_transcript: string;
  draft_json: StructuredDraft;
  created_at: string;
  updated_at: string;
};

type SupabaseField = {
  id: string;
  complaint_id: string;
  field_key: string;
  label: string;
  value: string;
  source: DraftField["source"];
  confidence: DraftField["confidence"];
  verification_state: "unverified" | "citizen_confirmed" | "officer_verified";
  updated_at: string;
};

type SupabaseEvidence = {
  id: string;
  complaint_id: string;
  storage_key: string | null;
  mime_type: string | null;
  byte_size: number | null;
  sha256: string | null;
  encryption_metadata: { algorithm?: string; iv?: string; encrypted?: boolean } | null;
  tamper_status: "not_checked" | "match" | "mismatch" | "unavailable";
  created_at: string;
};

type SupabaseAuditEvent = {
  id: string;
  complaint_id: string;
  actor_label: string;
  actor_role: "citizen" | "constable" | "system";
  event_type: "created" | "transcribed" | "drafted" | "citizen_confirmed" | "field_corrected" | "returned" | "verified" | "evidence_checked" | "context_added" | "clarification_added";
  field_key: string | null;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
};

type SupabaseBnsReference = {
  id: string;
  section_code: string;
  title: string;
  summary: string;
  source_label: string;
  source_url: string | null;
  reviewed_at: string | null;
  eligibility_indicators: string[];
  verification_status: "demo_only" | "unverified" | "verified";
  updated_at: string;
};

type SupabaseProfile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "citizen" | "constable" | "administrator";
  created_at: string;
  updated_at: string;
};

type SupabaseIntakeDraft = {
  id: string;
  resume_code_hash: string;
  language: SupportedLanguage;
  source_transcript: string;
  citizen_context: CitizenContext;
  current_step: number;
  consent_at: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

const complaintColumns = "id,public_id,language,status,consent_at,citizen_confirmed_at,source_transcript,draft_json,created_at,updated_at";
const intakeDraftColumns = "id,resume_code_hash,language,source_transcript,citizen_context,current_step,consent_at,created_at,updated_at,expires_at";

function mapComplaint(row: SupabaseComplaint) {
  return {
    id: row.id,
    publicId: row.public_id,
    language: row.language,
    status: row.status,
    consentAt: row.consent_at ? new Date(row.consent_at) : null,
    citizenConfirmedAt: row.citizen_confirmed_at ? new Date(row.citizen_confirmed_at) : null,
    sourceTranscript: row.source_transcript,
    draftJson: row.draft_json,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapField(row: SupabaseField) {
  return { id: row.id, complaintId: row.complaint_id, fieldKey: row.field_key, label: row.label, value: row.value, source: row.source, confidence: row.confidence, verificationState: row.verification_state, updatedAt: new Date(row.updated_at) };
}

function mapEvidence(row: SupabaseEvidence) {
  return { id: row.id, complaintId: row.complaint_id, storageKey: row.storage_key, mimeType: row.mime_type, byteSize: row.byte_size, sha256: row.sha256, encryptionMetadata: row.encryption_metadata, tamperStatus: row.tamper_status, createdAt: new Date(row.created_at) };
}

function mapAuditEvent(row: SupabaseAuditEvent) {
  return { id: row.id, complaintId: row.complaint_id, actorLabel: row.actor_label, actorRole: row.actor_role, eventType: row.event_type, fieldKey: row.field_key, previousValue: row.previous_value, newValue: row.new_value, reason: row.reason, createdAt: new Date(row.created_at) };
}

function mapIntakeDraft(row: SupabaseIntakeDraft): ResumableIntakeDraft {
  return { language: row.language, sourceTranscript: row.source_transcript, context: row.citizen_context ?? {}, currentStep: row.current_step, expiresAt: new Date(row.expires_at) };
}

async function insertAuditEvent(event: Omit<SupabaseAuditEvent, "id" | "created_at">) {
  await supabaseRequest("fir_saathi_audit_events", { method: "POST", prefer: "return=minimal", body: JSON.stringify(event) });
}

async function findComplaintRow(publicId: string) {
  const rows = await supabaseRequest<SupabaseComplaint[]>(`fir_saathi_complaints?select=${complaintColumns}&public_id=eq.${encodeURIComponent(publicId)}&limit=1`);
  return rows[0];
}

function normaliseResumeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashResumeCode(value: string) {
  return createHash("sha256").update(normaliseResumeCode(value)).digest("hex");
}

function createResumeCode() {
  return `FSR-${randomBytes(16).toString("hex").toUpperCase()}`;
}

async function findActiveIntakeDraftByCode(resumeCode: string) {
  const expiresAt = encodeURIComponent(new Date().toISOString());
  const codeHash = hashResumeCode(resumeCode);
  const rows = await supabaseRequest<SupabaseIntakeDraft[]>(`fir_saathi_intake_drafts?select=${intakeDraftColumns}&resume_code_hash=eq.${codeHash}&expires_at=gt.${expiresAt}&limit=1`);
  return rows[0];
}

async function requireComplaint(publicId: string) {
  const complaint = await findComplaintRow(publicId);
  if (!complaint) throw new Error("Complaint not found.");
  return complaint;
}

async function ensureBnsReferences() {
  const references = BNS_REVIEW_REFERENCES.map((reference) => ({
    section_code: reference.sectionCode,
    title: reference.title,
    summary: reference.summary,
    source_label: reference.sourceLabel,
    source_url: reference.sourceUrl,
    reviewed_at: reference.reviewedAt,
    eligibility_indicators: reference.eligibilityIndicators,
    verification_status: reference.verificationStatus,
  }));
  await supabaseRequest("fir_saathi_bns_references?on_conflict=section_code", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(references) });
}

const contextLabels: Record<keyof CitizenContext, string> = {
  incident_when: "Incident time or approximate time",
  incident_where: "Incident place or landmark",
  people_or_vehicle: "People or vehicle details",
  property_or_loss: "Property, document, or loss details",
  injury_or_safety: "Injury, threat, or immediate safety detail",
  follow_up_contact: "Safe follow-up contact or time",
};

function normaliseCitizenContext(context: CitizenContext) {
  return Object.entries(context)
    .flatMap(([key, value]) => typeof value === "string" && value.trim() && key in contextLabels ? [{ key: key as keyof CitizenContext, value: value.trim() }] : [])
    .slice(0, 6);
}

async function saveCitizenContext(complaintId: string, context: CitizenContext, eventType: "context_added" | "clarification_added" = "context_added") {
  const entries = normaliseCitizenContext(context);
  if (!entries.length) return 0;
  await supabaseRequest("fir_saathi_complaint_fields", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(entries.map(({ key, value }) => ({ complaint_id: complaintId, field_key: `context_${key}`, label: contextLabels[key], value, source: "citizen_context", confidence: "manual", verification_state: "unverified" }))),
  });
  await insertAuditEvent({ complaint_id: complaintId, actor_label: "Citizen", actor_role: "citizen", event_type: eventType, field_key: null, previous_value: null, new_value: `${entries.length} citizen-provided context detail${entries.length === 1 ? "" : "s"} stored separately from the source statement`, reason: null });
  return entries.length;
}

export async function listComplaints() {
  await ensureBnsReferences();
  const rows = await supabaseRequest<SupabaseComplaint[]>(`fir_saathi_complaints?select=${complaintColumns}&order=updated_at.desc`);
  return rows.map(mapComplaint);
}

export async function getComplaintDetail(publicId: string) {
  await ensureBnsReferences();
  const complaint = await findComplaintRow(publicId);
  if (!complaint) return undefined;
  const [fields, evidence, audit] = await Promise.all([
    supabaseRequest<SupabaseField[]>(`fir_saathi_complaint_fields?select=*&complaint_id=eq.${complaint.id}&order=updated_at.asc`),
    supabaseRequest<SupabaseEvidence[]>(`fir_saathi_audio_evidence?select=*&complaint_id=eq.${complaint.id}&order=created_at.desc`),
    supabaseRequest<SupabaseAuditEvent[]>(`fir_saathi_audit_events?select=*&complaint_id=eq.${complaint.id}&order=created_at.desc`),
  ]);
  return { complaint: mapComplaint(complaint), fields: fields.map(mapField), evidence: evidence.map(mapEvidence), audit: audit.map(mapAuditEvent) };
}

export async function saveIntakeDraft(input: { language: SupportedLanguage; sourceTranscript: string; context: CitizenContext; currentStep: number; consent: true; resumeCode?: string }) {
  const expiresAt = new Date(Date.now() + INTAKE_DRAFT_EXPIRY_HOURS * 60 * 60 * 1000);
  const existing = input.resumeCode ? await findActiveIntakeDraftByCode(input.resumeCode) : undefined;
  const payload = {
    language: input.language,
    source_transcript: input.sourceTranscript.trim(),
    citizen_context: Object.fromEntries(normaliseCitizenContext(input.context).map(({ key, value }) => [key, value])),
    current_step: input.currentStep,
    consent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  if (existing) {
    await supabaseRequest(`fir_saathi_intake_drafts?id=eq.${existing.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(payload) });
    return { resumeCode: normaliseResumeCode(input.resumeCode!), expiresAt, updatedExisting: true };
  }

  const resumeCode = createResumeCode();
  await supabaseRequest("fir_saathi_intake_drafts", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ ...payload, resume_code_hash: hashResumeCode(resumeCode) }),
  });
  return { resumeCode, expiresAt, updatedExisting: false };
}

export async function resumeIntakeDraft(resumeCode: string) {
  const draft = await findActiveIntakeDraftByCode(resumeCode);
  if (!draft) throw new Error("This saved intake is unavailable. Check the private resume code or begin a new intake.");
  return mapIntakeDraft(draft);
}

async function consumeIntakeDraft(resumeCode?: string) {
  if (!resumeCode) return;
  const existing = await findActiveIntakeDraftByCode(resumeCode);
  if (!existing) return;
  await supabaseRequest(`fir_saathi_intake_drafts?id=eq.${existing.id}`, { method: "DELETE", prefer: "return=minimal" });
}

export async function createComplaint(input: { language: SupportedLanguage; sourceTranscript: string; consent: boolean; context: CitizenContext; resumeCode?: string }) {
  const publicId = `FS-${nanoid(7).toUpperCase()}`;
  const created = await supabaseRequest<SupabaseComplaint[]>("fir_saathi_complaints", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ public_id: publicId, language: input.language, status: "needs_citizen_confirmation", consent_at: input.consent ? new Date().toISOString() : null, source_transcript: input.sourceTranscript, draft_json: EMPTY_DRAFT }),
  });
  const complaint = created[0];
  if (!complaint) throw new Error("Unable to create the draft record.");
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: "Citizen", actor_role: "citizen", event_type: "created", field_key: null, previous_value: null, new_value: "Citizen-created text draft", reason: null });
  await draftComplaint(publicId);
  await saveCitizenContext(complaint.id, input.context);
  await consumeIntakeDraft(input.resumeCode);
  return { publicId };
}

export async function draftComplaint(publicId: string) {
  const complaint = await requireComplaint(publicId);
  if (complaint.status === "verified") throw new Error("A verified prototype record cannot be redrafted.");
  const draft = await generateSafeDraft({ language: complaint.language, sourceStatement: complaint.source_transcript });
  await supabaseRequest(`fir_saathi_complaints?public_id=eq.${encodeURIComponent(publicId)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ draft_json: draft }) });
  await supabaseRequest(`fir_saathi_complaint_fields?complaint_id=eq.${complaint.id}&source=eq.source_statement`, { method: "DELETE", prefer: "return=minimal" });
  if (draft.fields.length) {
    await supabaseRequest("fir_saathi_complaint_fields", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(draft.fields.map((field) => ({ complaint_id: complaint.id, field_key: field.key, label: field.label, value: field.value, source: field.source, confidence: field.confidence, verification_state: "unverified" }))),
    });
  }
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: "Prototype drafting service", actor_role: "system", event_type: "drafted", field_key: null, previous_value: null, new_value: draft.fields.length ? "Schema-constrained draft generated from verbatim source excerpts" : "No source excerpts were safely extracted; review required", reason: null });
  return draft;
}

function hashBytes(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }

export async function createVoiceComplaint(input: { language: SupportedLanguage; mimeType: string; rawAudioBase64: string; encryptedAudioBase64: string; ivBase64: string; ciphertextSha256: string; context: CitizenContext }) {
  const rawAudio = Buffer.from(input.rawAudioBase64, "base64");
  const encryptedAudio = Buffer.from(input.encryptedAudioBase64, "base64");
  if (!rawAudio.length || !encryptedAudio.length) throw new Error("The recorded audio could not be read.");
  if (rawAudio.length > 12 * 1024 * 1024) throw new Error("For this prototype, audio recordings must be 12 MB or smaller.");
  if (hashBytes(encryptedAudio) !== input.ciphertextSha256) throw new Error("The encrypted audio fingerprint did not match the uploaded record.");
  const transcription = await groqTranscribe({ audio: rawAudio, mimeType: input.mimeType, language: input.language, prompt: `Citizen complaint statement in ${input.language}. Preserve words, code-switching, names, places, dates, digits, vehicle details, and spelling as heard. Do not translate, summarise, formalise, correct, or add facts.` });
  const sourceTranscript = transcription.text.trim();
  if (!sourceTranscript) throw new Error("The recording did not produce a usable source transcript. Please try again or use the text option.");

  const publicId = `FS-${nanoid(7).toUpperCase()}`;
  const created = await supabaseRequest<SupabaseComplaint[]>("fir_saathi_complaints", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ public_id: publicId, language: input.language, status: "needs_citizen_confirmation", consent_at: new Date().toISOString(), source_transcript: sourceTranscript, draft_json: EMPTY_DRAFT }),
  });
  const complaint = created[0];
  if (!complaint) throw new Error("Unable to create the voice draft record.");
  try {
    const evidence = await portableEvidencePut(publicId, encryptedAudio);
    await supabaseRequest("fir_saathi_audio_evidence", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ complaint_id: complaint.id, storage_key: evidence.key, mime_type: input.mimeType, byte_size: encryptedAudio.length, sha256: input.ciphertextSha256, encryption_metadata: { algorithm: "AES-GCM", iv: input.ivBase64, encrypted: true }, tamper_status: "match" }) });
    await Promise.all([
      insertAuditEvent({ complaint_id: complaint.id, actor_label: "Citizen", actor_role: "citizen", event_type: "created", field_key: null, previous_value: null, new_value: "Citizen-created voice draft", reason: null }),
      insertAuditEvent({ complaint_id: complaint.id, actor_label: "Prototype transcription service", actor_role: "system", event_type: "transcribed", field_key: null, previous_value: null, new_value: `Source transcript captured (${sourceTranscript.length} characters); ${transcription.quality.assessment === "review" ? "automated quality indicators request careful citizen read-back" : "automated quality indicators did not request extra read-back"}; raw audio not persisted`, reason: null }),
      insertAuditEvent({ complaint_id: complaint.id, actor_label: "Prototype evidence service", actor_role: "system", event_type: "evidence_checked", field_key: null, previous_value: null, new_value: "Encrypted ciphertext hash matched at capture", reason: null }),
    ]);
    await draftComplaint(publicId);
    await saveCitizenContext(complaint.id, input.context);
  } catch (error) {
    await supabaseRequest(`fir_saathi_complaints?id=eq.${complaint.id}`, { method: "DELETE", prefer: "return=minimal" });
    throw error;
  }
  return { publicId, transcript: sourceTranscript, detectedLanguage: transcription.language, quality: transcription.quality };
}

export async function verifyEvidenceHash(input: { publicId: string; evidenceId: string; actorLabel: string }) {
  const complaint = await requireComplaint(input.publicId);
  const rows = await supabaseRequest<SupabaseEvidence[]>(`fir_saathi_audio_evidence?select=*&id=eq.${input.evidenceId}&complaint_id=eq.${complaint.id}&limit=1`);
  const evidence = rows[0];
  if (!evidence?.storage_key || !evidence.sha256) throw new Error("Evidence storage metadata is unavailable for this record.");
  const signedUrl = await portableEvidenceSignedUrl(evidence.storage_key);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Stored encrypted evidence could not be retrieved for verification.");
  const tamperStatus = hashBytes(Buffer.from(await response.arrayBuffer())) === evidence.sha256 ? "match" as const : "mismatch" as const;
  await supabaseRequest(`fir_saathi_audio_evidence?id=eq.${evidence.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ tamper_status: tamperStatus }) });
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: input.actorLabel, actor_role: "constable", event_type: "evidence_checked", field_key: null, previous_value: null, new_value: tamperStatus === "match" ? "Stored ciphertext SHA-256 matches the capture fingerprint" : "Stored ciphertext SHA-256 does not match the capture fingerprint", reason: null });
  return { tamperStatus };
}

export async function confirmComplaint(publicId: string) {
  const complaint = await requireComplaint(publicId);
  if (complaint.status === "verified") throw new Error("A verified prototype record cannot be confirmed again.");
  if (complaint.status !== "needs_citizen_confirmation" && complaint.status !== "returned") throw new Error("This record is not waiting for citizen confirmation.");
  await Promise.all([
    supabaseRequest(`fir_saathi_complaints?id=eq.${complaint.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status: "ready_for_review", citizen_confirmed_at: new Date().toISOString() }) }),
    supabaseRequest(`fir_saathi_complaint_fields?complaint_id=eq.${complaint.id}&source=eq.citizen_context`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ verification_state: "citizen_confirmed" }) }),
  ]);
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: "Citizen", actor_role: "citizen", event_type: "citizen_confirmed", field_key: null, previous_value: null, new_value: "Explicit citizen confirmation", reason: null });
}

export async function addCitizenClarification(input: { publicId: string; clarification: string }) {
  const complaint = await requireComplaint(input.publicId);
  if (complaint.status !== "returned") throw new Error("A clarification can only be added after a constable return request.");
  const value = input.clarification.trim();
  if (value.length < 4) throw new Error("Please add a short clarification before sending it back to review.");
  const fieldKey = `clarification_${Date.now()}`;
  await supabaseRequest("fir_saathi_complaint_fields", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ complaint_id: complaint.id, field_key: fieldKey, label: "Citizen clarification", value, source: "citizen_context", confidence: "manual", verification_state: "unverified" }) });
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: "Citizen", actor_role: "citizen", event_type: "clarification_added", field_key: fieldKey, previous_value: null, new_value: "Citizen clarification added separately from the source statement", reason: null });
  return { success: true };
}

export async function addPreConfirmationContext(input: { publicId: string; key: keyof CitizenContext; value: string }) {
  const complaint = await requireComplaint(input.publicId);
  if (complaint.status !== "needs_citizen_confirmation") throw new Error("This detail can only be added while your draft is awaiting confirmation.");
  const value = input.value.trim();
  if (value.length < 2) throw new Error("Please add a short detail or skip this optional question.");
  const label = contextLabels[input.key];
  const fieldKey = `context_${input.key}`;
  const existingRows = await supabaseRequest<SupabaseField[]>(`fir_saathi_complaint_fields?select=*&complaint_id=eq.${complaint.id}&field_key=eq.${encodeURIComponent(fieldKey)}&limit=1`);
  const existing = existingRows[0];
  if (existing) {
    await supabaseRequest(`fir_saathi_complaint_fields?id=eq.${existing.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ value, label, source: "citizen_context", confidence: "manual", verification_state: "unverified" }) });
  } else {
    await supabaseRequest("fir_saathi_complaint_fields", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ complaint_id: complaint.id, field_key: fieldKey, label, value, source: "citizen_context", confidence: "manual", verification_state: "unverified" }) });
  }
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: "Citizen", actor_role: "citizen", event_type: "context_added", field_key: fieldKey, previous_value: existing?.value ?? null, new_value: "Citizen-provided follow-up detail stored separately from the source statement", reason: null });
  return { success: true };
}

export async function correctComplaintField(input: { publicId: string; fieldKey: string; label: string; value: string; actorLabel: string; reason: string }) {
  const complaint = await requireComplaint(input.publicId);
  const existingRows = await supabaseRequest<SupabaseField[]>(`fir_saathi_complaint_fields?select=*&complaint_id=eq.${complaint.id}&field_key=eq.${encodeURIComponent(input.fieldKey)}&limit=1`);
  const existing = existingRows[0];
  if (existing) {
    await supabaseRequest(`fir_saathi_complaint_fields?id=eq.${existing.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ value: input.value, source: "officer_correction", confidence: "manual", verification_state: "unverified" }) });
  } else {
    await supabaseRequest("fir_saathi_complaint_fields", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ complaint_id: complaint.id, field_key: input.fieldKey, label: input.label, value: input.value, source: "officer_correction", confidence: "manual", verification_state: "unverified" }) });
  }
  await supabaseRequest(`fir_saathi_complaints?id=eq.${complaint.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status: "ready_for_review" }) });
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: input.actorLabel, actor_role: "constable", event_type: "field_corrected", field_key: input.fieldKey, previous_value: existing?.value ?? null, new_value: input.value, reason: input.reason });
}

export async function returnComplaint(input: { publicId: string; actorLabel: string; reason: string }) {
  const complaint = await requireComplaint(input.publicId);
  await supabaseRequest(`fir_saathi_complaints?id=eq.${complaint.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status: "returned" }) });
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: input.actorLabel, actor_role: "constable", event_type: "returned", field_key: null, previous_value: null, new_value: "Returned for citizen clarification", reason: input.reason });
}

export async function verifyComplaint(input: { publicId: string; actorLabel: string }) {
  const complaint = await requireComplaint(input.publicId);
  await Promise.all([
    supabaseRequest(`fir_saathi_complaints?id=eq.${complaint.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ status: "verified" }) }),
    supabaseRequest(`fir_saathi_complaint_fields?complaint_id=eq.${complaint.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ verification_state: "officer_verified" }) }),
  ]);
  await insertAuditEvent({ complaint_id: complaint.id, actor_label: input.actorLabel, actor_role: "constable", event_type: "verified", field_key: null, previous_value: null, new_value: "Prototype record verified; no FIR registered", reason: null });
}

export async function listDemoBnsReferences() {
  await ensureBnsReferences();
  const rows = await supabaseRequest<SupabaseBnsReference[]>("fir_saathi_bns_references?select=*&order=section_code.asc");
  return rows.map((row: SupabaseBnsReference) => ({ id: row.id, sectionCode: row.section_code, title: row.title, summary: row.summary, sourceLabel: row.source_label, sourceUrl: row.source_url, reviewedAt: row.reviewed_at, eligibilityIndicators: row.eligibility_indicators ?? [], verificationStatus: row.verification_status, updatedAt: new Date(row.updated_at) }));
}

export async function listRoleProfiles() {
  const rows = await supabaseRequest<SupabaseProfile[]>("fir_saathi_profiles?select=id,email,display_name,role,created_at,updated_at&order=created_at.desc");
  return rows.map((profile) => ({ id: profile.id, email: profile.email, displayName: profile.display_name, role: profile.role, createdAt: new Date(profile.created_at), updatedAt: new Date(profile.updated_at) }));
}

export async function assignProfileRole(profileId: string, role: "citizen" | "constable") {
  await supabaseRequest(`fir_saathi_profiles?id=eq.${encodeURIComponent(profileId)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ role, updated_at: new Date().toISOString() }) });
}
