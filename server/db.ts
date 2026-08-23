import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { auditEvents, audioEvidence, bnsReferences, complaintFields, complaints, type InsertUser, users } from "../drizzle/schema";
import { DEMO_BNS_REFERENCES, EMPTY_DRAFT, type StructuredDraft } from "../shared/firSaathi";
import { ENV } from "./_core/env";
import { storageGetSignedUrl, storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { generateSafeDraft } from "./drafting";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("The prototype database is not available.");
  return db;
}

const demoGujaratiDraft: StructuredDraft = {
  fields: [
    { key: "incident", label: "Incident detail", value: "બે લોકોએ રોકી મારી ચેન લઈ લીધી", sourceQuote: "બે લોકોએ રોકી મારી ચેન લઈ લીધી", required: true, source: "source_statement", confidence: "high" },
    { key: "witness", label: "Witness detail", value: "નજીકમાં દુકાનદાર હતા", sourceQuote: "નજીકમાં દુકાનદાર હતા", required: false, source: "source_statement", confidence: "medium" },
  ],
  missingDetails: ["Exact time of incident", "Approximate location", "Whether anyone was injured"],
  followUpQuestions: ["ઘટના લગભગ કેટલા વાગ્યે બની હતી?", "આ ઘટના કયા રસ્તા અથવા જગ્યાએ બની હતી?", "શું કોઈને ઈજા થઈ હતી?"],
  bnsSuggestions: [{ sectionCode: "BNS 304", title: "Snatching", confidence: "medium", rationale: "Demonstrative match based only on the cited property-taking account. Officer review required." }],
  sourcePreservationNote: "The source statement is preserved as entered. This demonstrative draft does not replace, translate, or formalise it.",
};

const demoHindiDraft: StructuredDraft = {
  fields: [
    { key: "incident", label: "Incident detail", value: "मेरे पड़ोसी ने पिछले कुछ दिनों से मुझे बार-बार परेशान किया है", sourceQuote: "मेरे पड़ोसी ने पिछले कुछ दिनों से मुझे बार-बार परेशान किया है", required: true, source: "source_statement", confidence: "high" },
  ],
  missingDetails: ["Dates of reported incidents", "Specific actions described", "Any witnesses"],
  followUpQuestions: ["यह घटना किन तारीखों को हुई?", "कृपया बताइए कि व्यक्ति ने क्या कहा या किया?", "क्या किसी और ने यह देखा या सुना?"],
  bnsSuggestions: [{ sectionCode: "REVIEW", title: "Officer review required", confidence: "review", rationale: "No demonstration allow-list reference should be suggested from this limited account." }],
  sourcePreservationNote: "The source statement is preserved as entered. This demonstrative draft does not replace, translate, or formalise it.",
};

export async function ensurePrototypeSeedData() {
  const db = await requireDb();
  await db.insert(bnsReferences).values([...DEMO_BNS_REFERENCES]).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  const existing = await db.select({ id: complaints.id }).from(complaints).limit(1);
  if (existing.length) {
    await alignLegacyDemoRecords(db);
    return;
  }

  const seeds: Array<{ publicId: string; language: "en" | "hi" | "gu"; status: "needs_citizen_confirmation" | "ready_for_review" | "returned"; sourceTranscript: string; draftJson: StructuredDraft }> = [
    { publicId: "FS-2408", language: "gu" as const, status: "needs_citizen_confirmation" as const, sourceTranscript: "મને ગઈકાલે સાંજે રસ્તા પર બે લોકોએ રોકી મારી ચેન લઈ લીધી. નજીકમાં દુકાનદાર હતા.", draftJson: demoGujaratiDraft },
    { publicId: "FS-2407", language: "hi" as const, status: "ready_for_review" as const, sourceTranscript: "मेरे पड़ोसी ने पिछले कुछ दिनों से मुझे बार-बार परेशान किया है।", draftJson: demoHindiDraft },
    { publicId: "FS-2406", language: "en" as const, status: "returned" as const, sourceTranscript: "Someone damaged my parked vehicle outside my home last night.", draftJson: { ...EMPTY_DRAFT, missingDetails: ["Vehicle description", "Exact time", "Potential witness"], followUpQuestions: ["What vehicle was damaged?", "When did you first notice the damage?"], bnsSuggestions: [{ sectionCode: "REVIEW", title: "Officer review required", confidence: "review", rationale: "No demonstration reference fits the available statement." }] } },
  ];

  for (const seed of seeds) {
    const [complaint] = await db.insert(complaints).values({ ...seed, consentAt: new Date(), citizenConfirmedAt: seed.status === "ready_for_review" ? new Date() : null }).$returningId();
    if (!complaint) continue;
    if (seed.draftJson.fields.length) await db.insert(complaintFields).values(seed.draftJson.fields.map((field) => ({ complaintId: complaint.id, fieldKey: field.key, label: field.label, value: field.value, source: field.source, confidence: field.confidence, verificationState: seed.status === "ready_for_review" ? ("citizen_confirmed" as const) : ("unverified" as const) })));
    await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: "Prototype system", actorRole: "system", eventType: "created", newValue: "Synthetic demonstration record created" });
  }
}

async function alignLegacyDemoRecords(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const legacyRecords = await db.select().from(complaints).where(and(eq(complaints.publicId, "FS-2407"), eq(complaints.status, "ready_for_review"))).limit(1);
  const legacyRecord = legacyRecords[0];
  if (!legacyRecord) return;
  const legacyFields = await db.select().from(complaintFields).where(eq(complaintFields.complaintId, legacyRecord.id));
  if (!legacyFields.some((field) => field.source === "assistant_draft")) return;
  await db.update(complaints).set({ draftJson: demoHindiDraft }).where(eq(complaints.id, legacyRecord.id));
  await db.delete(complaintFields).where(eq(complaintFields.complaintId, legacyRecord.id));
  await db.insert(complaintFields).values(demoHindiDraft.fields.map((field) => ({
    complaintId: legacyRecord.id,
    fieldKey: field.key,
    label: field.label,
    value: field.value,
    source: field.source,
    confidence: field.confidence,
    verificationState: "citizen_confirmed" as const,
  })));
  await db.insert(auditEvents).values({
    complaintId: legacyRecord.id,
    actorLabel: "Prototype migration",
    actorRole: "system",
    eventType: "drafted",
    newValue: "Legacy synthetic summary fields replaced with verbatim source excerpts",
  });
}

export async function listComplaints() {
  await ensurePrototypeSeedData();
  const db = await requireDb();
  return db.select().from(complaints).orderBy(desc(complaints.updatedAt));
}

export async function getComplaintDetail(publicId: string) {
  await ensurePrototypeSeedData();
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, publicId)).limit(1))[0];
  if (!complaint) return undefined;
  const [fields, evidence, audit] = await Promise.all([
    db.select().from(complaintFields).where(eq(complaintFields.complaintId, complaint.id)).orderBy(asc(complaintFields.id)),
    db.select().from(audioEvidence).where(eq(audioEvidence.complaintId, complaint.id)).orderBy(desc(audioEvidence.createdAt)),
    db.select().from(auditEvents).where(eq(auditEvents.complaintId, complaint.id)).orderBy(desc(auditEvents.createdAt)),
  ]);
  return { complaint, fields, evidence, audit };
}

export async function createComplaint(input: { language: "en" | "hi" | "gu"; sourceTranscript: string; consent: boolean }) {
  const db = await requireDb();
  const publicId = `FS-${nanoid(7).toUpperCase()}`;
  const [created] = await db.insert(complaints).values({ publicId, language: input.language, status: "needs_citizen_confirmation", consentAt: input.consent ? new Date() : null, sourceTranscript: input.sourceTranscript, draftJson: EMPTY_DRAFT }).$returningId();
  if (!created) throw new Error("Unable to create the draft record.");
  await db.insert(auditEvents).values({ complaintId: created.id, actorLabel: "Citizen", actorRole: "citizen", eventType: "created", newValue: "Citizen-created text draft" });
  await draftComplaint(publicId);
  return { publicId };
}

export async function draftComplaint(publicId: string) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  if (complaint.status === "verified") throw new Error("A verified prototype record cannot be redrafted.");
  const draft = await generateSafeDraft({ language: complaint.language, sourceStatement: complaint.sourceTranscript });
  await db.update(complaints).set({ draftJson: draft }).where(eq(complaints.id, complaint.id));
  await db.delete(complaintFields).where(eq(complaintFields.complaintId, complaint.id));
  if (draft.fields.length) await db.insert(complaintFields).values(draft.fields.map((field) => ({ complaintId: complaint.id, fieldKey: field.key, label: field.label, value: field.value, source: field.source, confidence: field.confidence, verificationState: "unverified" as const })));
  await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: "Prototype drafting service", actorRole: "system", eventType: "drafted", newValue: draft.fields.length ? "Schema-constrained draft generated from verbatim source excerpts" : "No source excerpts were safely extracted; review required" });
  return draft;
}

function hashBytes(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function createVoiceComplaint(input: {
  language: "en" | "hi" | "gu";
  mimeType: string;
  rawAudioBase64: string;
  encryptedAudioBase64: string;
  ivBase64: string;
  ciphertextSha256: string;
}) {
  const rawAudio = Buffer.from(input.rawAudioBase64, "base64");
  const encryptedAudio = Buffer.from(input.encryptedAudioBase64, "base64");
  if (!rawAudio.length || !encryptedAudio.length) throw new Error("The recorded audio could not be read.");
  if (rawAudio.length > 12 * 1024 * 1024) throw new Error("For this prototype, audio recordings must be 12 MB or smaller.");
  if (hashBytes(encryptedAudio) !== input.ciphertextSha256) throw new Error("The encrypted audio fingerprint did not match the uploaded record.");

  const transcription = await transcribeAudio({
    audioUrl: `data:${input.mimeType};base64,${input.rawAudioBase64}`,
    language: input.language,
    prompt: "Transcribe exactly what the citizen says. Do not translate, summarise, formalise, correct, or add facts.",
  });
  if ("error" in transcription) throw new Error(transcription.error);
  const sourceTranscript = transcription.text.trim();
  if (!sourceTranscript) throw new Error("The recording did not produce a usable source transcript. Please try again or use the text option.");

  const db = await requireDb();
  const publicId = `FS-${nanoid(7).toUpperCase()}`;
  const [created] = await db.insert(complaints).values({
    publicId,
    language: input.language,
    status: "needs_citizen_confirmation",
    consentAt: new Date(),
    sourceTranscript,
    draftJson: EMPTY_DRAFT,
  }).$returningId();
  if (!created) throw new Error("Unable to create the voice draft record.");

  try {
    const evidence = await storagePut(`fir-saathi/evidence/${publicId}/recording.enc`, encryptedAudio, "application/octet-stream");
    await db.insert(audioEvidence).values({
      complaintId: created.id,
      storageKey: evidence.key,
      mimeType: input.mimeType,
      byteSize: encryptedAudio.length,
      sha256: input.ciphertextSha256,
      encryptionMetadata: { algorithm: "AES-GCM", iv: input.ivBase64, encrypted: true },
      tamperStatus: "match",
    });
    await db.insert(auditEvents).values([
      { complaintId: created.id, actorLabel: "Citizen", actorRole: "citizen", eventType: "created", newValue: "Citizen-created voice draft" },
      { complaintId: created.id, actorLabel: "Prototype transcription service", actorRole: "system", eventType: "transcribed", newValue: `Source transcript captured (${sourceTranscript.length} characters); raw audio not persisted` },
      { complaintId: created.id, actorLabel: "Prototype evidence service", actorRole: "system", eventType: "evidence_checked", newValue: "Encrypted ciphertext hash matched at capture" },
    ]);
    await draftComplaint(publicId);
  } catch (error) {
    await db.delete(complaints).where(eq(complaints.id, created.id));
    throw error;
  }
  return { publicId, transcript: sourceTranscript, detectedLanguage: transcription.language };
}

export async function verifyEvidenceHash(input: { publicId: string; evidenceId: number; actorLabel: string }) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, input.publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  const evidence = (await db.select().from(audioEvidence).where(and(eq(audioEvidence.id, input.evidenceId), eq(audioEvidence.complaintId, complaint.id))).limit(1))[0];
  if (!evidence?.storageKey || !evidence.sha256) throw new Error("Evidence storage metadata is unavailable for this record.");
  const signedUrl = await storageGetSignedUrl(evidence.storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Stored encrypted evidence could not be retrieved for verification.");
  const actualHash = hashBytes(Buffer.from(await response.arrayBuffer()));
  const tamperStatus = actualHash === evidence.sha256 ? ("match" as const) : ("mismatch" as const);
  await db.update(audioEvidence).set({ tamperStatus }).where(eq(audioEvidence.id, evidence.id));
  await db.insert(auditEvents).values({
    complaintId: complaint.id,
    actorLabel: input.actorLabel,
    actorRole: "constable",
    eventType: "evidence_checked",
    newValue: tamperStatus === "match" ? "Stored ciphertext SHA-256 matches the capture fingerprint" : "Stored ciphertext SHA-256 does not match the capture fingerprint",
  });
  return { tamperStatus };
}

export async function confirmComplaint(publicId: string) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  await db.update(complaints).set({ status: "ready_for_review", citizenConfirmedAt: new Date() }).where(eq(complaints.id, complaint.id));
  await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: "Citizen", actorRole: "citizen", eventType: "citizen_confirmed", newValue: "Explicit citizen confirmation" });
}

export async function correctComplaintField(input: { publicId: string; fieldKey: string; label: string; value: string; actorLabel: string; reason: string }) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, input.publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  const existing = (await db.select().from(complaintFields).where(and(eq(complaintFields.complaintId, complaint.id), eq(complaintFields.fieldKey, input.fieldKey))).limit(1))[0];
  if (existing) {
    await db.update(complaintFields).set({ value: input.value, source: "officer_correction", confidence: "manual", verificationState: "unverified" }).where(eq(complaintFields.id, existing.id));
  } else {
    await db.insert(complaintFields).values({ complaintId: complaint.id, fieldKey: input.fieldKey, label: input.label, value: input.value, source: "officer_correction", confidence: "manual", verificationState: "unverified" });
  }
  await db.update(complaints).set({ status: "ready_for_review" }).where(eq(complaints.id, complaint.id));
  await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: input.actorLabel, actorRole: "constable", eventType: "field_corrected", fieldKey: input.fieldKey, previousValue: existing?.value ?? null, newValue: input.value, reason: input.reason });
}

export async function returnComplaint(input: { publicId: string; actorLabel: string; reason: string }) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, input.publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  await db.update(complaints).set({ status: "returned" }).where(eq(complaints.id, complaint.id));
  await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: input.actorLabel, actorRole: "constable", eventType: "returned", newValue: "Returned for citizen clarification", reason: input.reason });
}

export async function verifyComplaint(input: { publicId: string; actorLabel: string }) {
  const db = await requireDb();
  const complaint = (await db.select().from(complaints).where(eq(complaints.publicId, input.publicId)).limit(1))[0];
  if (!complaint) throw new Error("Complaint not found.");
  await db.update(complaints).set({ status: "verified" }).where(eq(complaints.id, complaint.id));
  await db.update(complaintFields).set({ verificationState: "officer_verified" }).where(eq(complaintFields.complaintId, complaint.id));
  await db.insert(auditEvents).values({ complaintId: complaint.id, actorLabel: input.actorLabel, actorRole: "constable", eventType: "verified", newValue: "Prototype record verified; no FIR registered" });
}

export async function listDemoBnsReferences() {
  await ensurePrototypeSeedData();
  const db = await requireDb();
  return db.select().from(bnsReferences).orderBy(asc(bnsReferences.sectionCode));
}
