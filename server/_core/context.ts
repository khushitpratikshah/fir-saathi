import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import { getPortableUser, type PortableUser, SUPABASE_ACCESS_COOKIE } from "../supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: PortableUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: PortableUser | null = null;

  try {
    const cookies = parse(opts.req.headers.cookie ?? "");
    user = await getPortableUser(cookies[SUPABASE_ACCESS_COOKIE]);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
