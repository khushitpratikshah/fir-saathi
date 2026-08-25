import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, constableProcedure, publicProcedure, router } from "./_core/trpc";
import { addCitizenClarification, addPreConfirmationContext, addTranscriptCorrection, assignProfileRole, confirmComplaint, correctComplaintField, createComplaint, createVoiceComplaint, draftComplaint, getComplaintDetail, listComplaints, listDemoBnsReferences, listRoleProfiles, requireCitizenAccess, resumeIntakeDraft, returnComplaint, rotateCitizenAccessCode, saveIntakeDraft, verifyComplaint, verifyEvidenceHash, withdrawComplaint } from "./db";
import { clearPortableSession, getPortableUser, storePortableSession } from "./supabaseAuth";
import { SUPPORTED_LANGUAGES } from "../shared/firSaathi";
import { generateSourceCoverage } from "./sourceCoverage";
import { groqReviewerTranslation } from "./groqProvider";

const publicIdSchema = z.string().trim().min(4).max(32);
const citizenAccessCodeSchema = z.string().trim().min(20).max(100);
const citizenContextSchema = z.object({
  incident_when: z.string().trim().max(240).optional(),
  incident_where: z.string().trim().max(320).optional(),
  people_or_vehicle: z.string().trim().max(500).optional(),
  property_or_loss: z.string().trim().max(500).optional(),
  injury_or_safety: z.string().trim().max(500).optional(),
  follow_up_contact: z.string().trim().max(320).optional(),
}).default({});

export const portableSessionInputSchema = z.object({
  accessToken: z.string().min(20).max(20_000),
  // Supabase refresh tokens are opaque values; only non-emptiness is stable across providers and projects.
  refreshToken: z.string().min(1).max(20_000),
  expiresIn: z.number().int().positive().max(60 * 60 * 24 * 7),
});

function databaseError(error: unknown): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "The prototype record could not be processed." });
}

function constableLabel(user: { name: string | null; email: string | null }) {
  return user.name?.trim() || user.email?.trim() || "Constable";
}

const publicRequestBuckets = new Map<string, { count: number; resetAt: number }>();

function enforcePublicRateLimit(ctx: { req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string | undefined } } }, scope: string, limit: number) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const address = (typeof forwarded === "string" ? forwarded.split(",")[0] : Array.isArray(forwarded) ? forwarded[0] : ctx.req.socket.remoteAddress) ?? "unknown";
  const now = Date.now();
  const key = `${scope}:${address.trim()}`;
  const bucket = publicRequestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    publicRequestBuckets.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests from this connection. Please wait a few minutes and try again." });
}

async function guardCitizenRecord(ctx: { req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string | undefined } } }, input: { publicId: string; citizenAccessCode: string }, scope: string) {
  enforcePublicRateLimit(ctx, scope, 24);
  try {
    await requireCitizenAccess(input.publicId, input.citizenAccessCode);
  } catch {
    throw new TRPCError({ code: "FORBIDDEN", message: "This private record access code is invalid or unavailable." });
  }
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    establishSession: publicProcedure.input(portableSessionInputSchema).mutation(async ({ input, ctx }) => {
      const user = await getPortableUser(input.accessToken);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "The Supabase session could not be verified." });
      storePortableSession(ctx.res, input);
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearPortableSession(ctx.res);
      return { success: true } as const;
    }),
  }),
  admin: router({
    profiles: router({
      list: adminProcedure.query(async () => { try { return await listRoleProfiles(); } catch (error) { return databaseError(error); } }),
      assignRole: adminProcedure.input(z.object({ profileId: z.string().uuid(), role: z.enum(["citizen", "constable"]) })).mutation(async ({ input, ctx }) => {
        if (input.profileId === ctx.user.id && input.role === "citizen") throw new TRPCError({ code: "BAD_REQUEST", message: "An administrator cannot remove their own access." });
        try { await assignProfileRole(input.profileId, input.role); return { success: true }; } catch (error) { return databaseError(error); }
      }),
    }),
  }),
  complaints: router({
    list: constableProcedure.query(async () => { try { return await listComplaints(); } catch (error) { return databaseError(error); } }),
    get: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema })).query(async ({ input, ctx }) => {
      try {
        await guardCitizenRecord(ctx, input, "citizen-record-read");
        const detail = await getComplaintDetail(input.publicId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "This prototype record was not found." });
        return detail;
      } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); }
    }),
    review: constableProcedure.input(z.object({ publicId: publicIdSchema })).query(async ({ input }) => {
      try {
        const detail = await getComplaintDetail(input.publicId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "This review record was not found." });
        return detail;
      } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); }
    }),
    reviewerTranslation: constableProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => {
      try {
        const detail = await getComplaintDetail(input.publicId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "This review record was not found." });
        if (detail.complaint.status === "withdrawn") throw new TRPCError({ code: "BAD_REQUEST", message: "This prototype record was withdrawn by the citizen and has no reviewable source content." });
        return await groqReviewerTranslation({ sourceStatement: detail.complaint.sourceTranscript, sourceLanguage: detail.complaint.language });
      } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); }
    }),
    create: publicProcedure.input(z.object({ language: z.enum(SUPPORTED_LANGUAGES), sourceTranscript: z.string().trim().min(8).max(12_000), consent: z.literal(true), context: citizenContextSchema, resumeCode: z.string().trim().min(12).max(100).optional() })).mutation(async ({ input, ctx }) => { try { enforcePublicRateLimit(ctx, "citizen-create", 8); return await createComplaint(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    previewSourceCoverage: publicProcedure.input(z.object({ language: z.enum(SUPPORTED_LANGUAGES), sourceTranscript: z.string().trim().min(8).max(6_000) })).mutation(async ({ input, ctx }) => {
      try { enforcePublicRateLimit(ctx, "source-coverage", 10); return await generateSourceCoverage({ language: input.language, sourceStatement: input.sourceTranscript }); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); }
    }),
    saveIntakeDraft: publicProcedure.input(z.object({ language: z.enum(SUPPORTED_LANGUAGES), sourceTranscript: z.string().trim().min(8).max(12_000), context: citizenContextSchema, currentStep: z.number().int().min(1).max(8), consent: z.literal(true), resumeCode: z.string().trim().min(12).max(100).optional() })).mutation(async ({ input, ctx }) => { try { enforcePublicRateLimit(ctx, "intake-draft-save", 12); return await saveIntakeDraft(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    resumeIntakeDraft: publicProcedure.input(z.object({ resumeCode: z.string().trim().min(12).max(100) })).query(async ({ input, ctx }) => { try { enforcePublicRateLimit(ctx, "intake-draft-resume", 16); return await resumeIntakeDraft(input.resumeCode); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    draft: constableProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => { try { return await draftComplaint(input.publicId); } catch (error) { return databaseError(error); } }),
    confirm: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-confirm"); await confirmComplaint(input.publicId); return { success: true }; } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    rotateCitizenAccessCode: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-access-rotation"); return await rotateCitizenAccessCode(input.publicId); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    withdraw: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-withdrawal"); return await withdrawComplaint(input.publicId); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    addClarification: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema, clarification: z.string().trim().min(4).max(2_000) })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-clarification"); return await addCitizenClarification(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    addTranscriptCorrection: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema, passage: z.string().trim().min(1).max(500), startSeconds: z.number().min(0).max(36_000), endSeconds: z.number().min(0).max(36_000), note: z.string().trim().min(2).max(1_000) }).refine((input) => input.endSeconds >= input.startSeconds, { message: "The selected transcript timestamp is invalid." })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-correction"); return await addTranscriptCorrection(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    addContext: publicProcedure.input(z.object({ publicId: publicIdSchema, citizenAccessCode: citizenAccessCodeSchema, key: z.enum(["incident_when", "incident_where", "injury_or_safety", "people_or_vehicle", "property_or_loss", "follow_up_contact"]), value: z.string().trim().min(2).max(500) })).mutation(async ({ input, ctx }) => { try { await guardCitizenRecord(ctx, input, "citizen-context"); return await addPreConfirmationContext(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    correctField: constableProcedure.input(z.object({ publicId: publicIdSchema, fieldKey: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), value: z.string().trim().min(1).max(5_000), reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input, ctx }) => { try { await correctComplaintField({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
    returnForCorrection: constableProcedure.input(z.object({ publicId: publicIdSchema, reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input, ctx }) => { try { await returnComplaint({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
    verify: constableProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input, ctx }) => { try { await verifyComplaint({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
  }),
  bns: router({ list: publicProcedure.query(async () => { try { return await listDemoBnsReferences(); } catch (error) { return databaseError(error); } }) }),
  evidence: router({
    captureAndTranscribe: publicProcedure.input(z.object({ language: z.enum(SUPPORTED_LANGUAGES), mimeType: z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"]), rawAudioBase64: z.string().min(10).max(17_000_000), audioSha256: z.string().regex(/^[a-f0-9]{64}$/), context: citizenContextSchema })).mutation(async ({ input, ctx }) => { try { enforcePublicRateLimit(ctx, "voice-transcription", 6); return await createVoiceComplaint(input); } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); } }),
    verifyHash: constableProcedure.input(z.object({ publicId: publicIdSchema, evidenceId: z.string().uuid() })).mutation(async ({ input, ctx }) => { try { return await verifyEvidenceHash({ ...input, actorLabel: constableLabel(ctx.user) }); } catch (error) { return databaseError(error); } }),
  }),
});

export type AppRouter = typeof appRouter;
