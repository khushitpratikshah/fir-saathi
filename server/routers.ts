import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, constableProcedure, publicProcedure, router } from "./_core/trpc";
import { assignProfileRole, confirmComplaint, correctComplaintField, createComplaint, createVoiceComplaint, draftComplaint, getComplaintDetail, listComplaints, listDemoBnsReferences, listRoleProfiles, returnComplaint, verifyComplaint, verifyEvidenceHash } from "./db";
import { clearPortableSession, getPortableUser, storePortableSession } from "./supabaseAuth";

const publicIdSchema = z.string().trim().min(4).max(32);

function databaseError(error: unknown): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "The prototype record could not be processed." });
}

function constableLabel(user: { name: string | null; email: string | null }) {
  return user.name?.trim() || user.email?.trim() || "Constable";
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    establishSession: publicProcedure.input(z.object({ accessToken: z.string().min(20).max(20_000), refreshToken: z.string().min(20).max(20_000), expiresIn: z.number().int().positive().max(60 * 60 * 24 * 7) })).mutation(async ({ input, ctx }) => {
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
    get: publicProcedure.input(z.object({ publicId: publicIdSchema })).query(async ({ input }) => {
      try {
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
    create: publicProcedure.input(z.object({ language: z.enum(["en", "hi", "gu"]), sourceTranscript: z.string().trim().min(8).max(12_000), consent: z.literal(true) })).mutation(async ({ input }) => { try { return await createComplaint(input); } catch (error) { return databaseError(error); } }),
    draft: publicProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => { try { return await draftComplaint(input.publicId); } catch (error) { return databaseError(error); } }),
    confirm: publicProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input }) => { try { await confirmComplaint(input.publicId); return { success: true }; } catch (error) { return databaseError(error); } }),
    correctField: constableProcedure.input(z.object({ publicId: publicIdSchema, fieldKey: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), value: z.string().trim().min(1).max(5_000), reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input, ctx }) => { try { await correctComplaintField({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
    returnForCorrection: constableProcedure.input(z.object({ publicId: publicIdSchema, reason: z.string().trim().min(4).max(2_000) })).mutation(async ({ input, ctx }) => { try { await returnComplaint({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
    verify: constableProcedure.input(z.object({ publicId: publicIdSchema })).mutation(async ({ input, ctx }) => { try { await verifyComplaint({ ...input, actorLabel: constableLabel(ctx.user) }); return { success: true }; } catch (error) { return databaseError(error); } }),
  }),
  bns: router({ list: publicProcedure.query(async () => { try { return await listDemoBnsReferences(); } catch (error) { return databaseError(error); } }) }),
  evidence: router({
    captureAndTranscribe: publicProcedure.input(z.object({ language: z.enum(["en", "hi", "gu"]), mimeType: z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"]), rawAudioBase64: z.string().min(10).max(17_000_000), encryptedAudioBase64: z.string().min(10).max(17_100_000), ivBase64: z.string().min(8).max(100), ciphertextSha256: z.string().regex(/^[a-f0-9]{64}$/) })).mutation(async ({ input }) => { try { return await createVoiceComplaint(input); } catch (error) { return databaseError(error); } }),
    verifyHash: constableProcedure.input(z.object({ publicId: publicIdSchema, evidenceId: z.string().uuid() })).mutation(async ({ input, ctx }) => { try { return await verifyEvidenceHash({ ...input, actorLabel: constableLabel(ctx.user) }); } catch (error) { return databaseError(error); } }),
  }),
});

export type AppRouter = typeof appRouter;
