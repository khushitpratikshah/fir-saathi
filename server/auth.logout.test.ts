import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE } from "./supabaseAuth";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "supabase",
    role: "citizen",
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears portable access and refresh cookies and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(2);
    expect(clearedCookies.map((call) => call.name)).toEqual([SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE]);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});
