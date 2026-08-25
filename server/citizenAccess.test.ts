import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createCitizenAccessCode, hashCitizenAccessCode, matchesCitizenAccessCode, normaliseCitizenAccessCode } from "./citizenAccess";

describe("private citizen access capabilities", () => {
  it("normalises, hashes, and verifies private access codes without exposing the source code", () => {
    const code = createCitizenAccessCode();
    expect(code).toMatch(/^FSC-[A-F0-9]{40}$/);
    expect(normaliseCitizenAccessCode(` ${code.toLowerCase()} `)).toBe(code.replace("-", ""));
    const storedHash = hashCitizenAccessCode(code);
    expect(storedHash).toHaveLength(64);
    expect(matchesCitizenAccessCode(storedHash, code)).toBe(true);
    expect(matchesCitizenAccessCode(storedHash, createCitizenAccessCode())).toBe(false);
  });

  it("rejects public record reads that omit the private access code before data access", async () => {
    const caller = appRouter.createCaller({ req: { headers: {}, socket: {} }, res: {}, user: null } as never);
    await expect(caller.complaints.get({ publicId: "FS-ABCDE" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
