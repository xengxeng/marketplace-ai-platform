import { NextResponse } from "next/server";
import { apiError, unexpectedError } from "@/lib/api/responses";
import { guardFailed, requireSupabase } from "@/lib/api/guards";
import { resolveRole, upsertProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  try {
    const { userId, email, fullName, role } = await request.json();

    if (!userId || !email) {
      return apiError("Missing user info", 400);
    }

    const guard = await requireSupabase();

    if (guardFailed(guard)) {
      return guard.response;
    }

    const { error } = await upsertProfile(guard.supabase, {
      userId,
      email,
      fullName,
      role: resolveRole(email, role ?? "guest"),
    });

    if (error) {
      return apiError(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return unexpectedError(error);
  }
}
