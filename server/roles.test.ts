import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "admin" | "constable" | "citizen" | null): TrpcContext {
  return {
    user: role ? {
      id: `${role}-account`,
      name: role === "admin" ? "Administrator Account" : role === "constable" ? "Constable Account" : "Citizen Account",
      email: `${role}@example.com`,
      loginMethod: "supabase",
      role,
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("constable and administrator role boundary", () => {
  it("rejects unauthenticated requests before listing complaints", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.complaints.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects citizen accounts from opening review records", async () => {
    const caller = appRouter.createCaller(contextFor("citizen"));
    await expect(caller.complaints.review({ publicId: "FS-TEST" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets constables reach review procedures but blocks them from administrator profile management", async () => {
    const caller = appRouter.createCaller(contextFor("constable"));
    await expect(caller.admin.profiles.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects client-provided officer identity because the review mutation contract no longer accepts it", () => {
    const schemaKeys = Object.keys(appRouter._def.procedures["complaints.correctField"]?._def.inputs?.[0]?._def.shape ?? {});
    expect(schemaKeys).not.toContain("actorLabel");
  });
});
