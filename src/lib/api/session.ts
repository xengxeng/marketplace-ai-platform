import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/require-role";

export type RequireRolesResult =
  | { ok: true; user: User; role: string }
  | { ok: false; response: NextResponse };

/**
 * Resolves the caller's session and role for a route handler, keeping the three
 * outcomes distinct: unknown (backend failure -> 503), signed out (401), and
 * insufficient role (403).
 */
export async function requireRoles(allowedRoles: string[]): Promise<RequireRolesResult> {
  const { user, role, error } = await getSessionProfile();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: `Unable to verify permissions: ${error}` }, { status: 503 }),
    };
  }

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  if (!allowedRoles.includes(role ?? "")) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, user, role: role ?? "guest" };
}
