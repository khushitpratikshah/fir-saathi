import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { confirmComplaint, correctComplaintField, createComplaint, createVoiceComplaint, draftComplaint, getComplaintDetail, listComplaints, listDemoBnsReferences, returnComplaint, verifyComplaint, verifyEvidenceHash } from "./db";

const publicIdSchema = z.string().trim().min(4).max(32);

function databaseError(error: unknown): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "The prototype record could not be processed." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  complaints: router({
    list: publicProcedure.query(async () => { try { return await listComplaints(); } catch (error) { return databaseError(error); } }),
    get: publicProcedure.input(z.object({ publicId: publicIdSchema })).query(async ({ input }) => {
      try {
        const detail = await getComplaintDetail(input.publicId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "This prototype record was not found." });
        return detail;
      } catch (error) { if (error instanceof TRPCError) throw error; return databaseError(error); }
    }),
    create: publicProcedure.input(z.object({ language: z.enum(["en", "hi", "gu"]), sourceTranscript: z.string().trim().min(8).max(12_000), consent: z.literal(true) })).mutation(async ({ input }) => {
      try { return await createComplaint(input); } catch (error) { return databaseError(error); }
    }),
    draft: publicProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => { try { return await draftComplaint(input.publicId); } catch (error) { return databaseError(error); } }),
    confirm: publicProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => { try { await confirmComplaint(input.publicId); return { success: true }; } catch (error) { return databaseError(error); } }),
    correctField: publicProcedure.input(z.object({ publicId: publicIdSchema, fieldKey: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), value: z.string().trim().min(1).max(5_000), actorLabel: z.string().trim().min(2).max(120), reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input }) => { try { await correctComplaintField(input); return { success: true }; } catch (error) { return databaseError(error); } }),
    returnForCorrection: publicProcedure.input(z.object({ publicId: publicIdSchema, actorLabel: z.string().trim().min(2).max(120), reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input }) => { try { await returnComplaint(input); return { success: true }; } catch (error) { return databaseError(error); } }),
    verify: publicProcedure.input(z.object({ publicId: publicIdSchema, actorLabel: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => { try { await verifyComplaint(input); return { success: true }; } catch (error) { return databaseError(error); } }),
  }),
  bns: router({ list: publicProcedure.query(async () => { try { return await listDemoBnsReferences(); } catch (error) { return databaseError(error); } }) }),
  evidence: router({
    captureAndTranscribe: publicProcedure.input(z.object({
      language: z.enum(["en", "hi", "gu"]),
      mimeType: z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"]),
      rawAudioBase64: z.string().min(10).max(17_000_000),
      encryptedAudioBase64: z.string().min(10).max(17_100_000),
      ivBase64: z.string().min(8).max(100),
      ciphertextSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })).mutation(async ({ input }) => { try { return await createVoiceComplaint(input); } catch (error) { return databaseError(error); } }),
    verifyHash: publicProcedure.input(z.object({ publicId: publicIdSchema, evidenceId: z.number().int().positive(), actorLabel: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => { try { return await verifyEvidenceHash(input); } catch (error) { return databaseError(error); } }),
  }),
});

export type AppRouter = typeof appRouter;
