import type { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/require-role";
import { hasRole } from "@/lib/auth/roles";
import { forbidden, supabaseNotConfigured, unauthorized } from "@/lib/api/responses";

type GuardFailure = { response: NextResponse };

export type Guard<T> = T | GuardFailure;

export function guardFailed<T extends object>(guard: Guard<T>): guard is GuardFailure {
  return "response" in guard;
}

export async function requireSupabase(): Promise<Guard<{ supabase: ServerSupabaseClient }>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { response: supabaseNotConfigured() };
  }

  return { supabase };
}

export async function requireUser(): Promise<Guard<{ supabase: ServerSupabaseClient; user: User }>> {
  const guard = await requireSupabase();

  if (guardFailed(guard)) {
    return guard;
  }

  const { data, error } = await guard.supabase.auth.getUser();

  if (error || !data.user) {
    return { response: unauthorized() };
  }

  return { supabase: guard.supabase, user: data.user };
}

export async function requireRole(
  allowedRoles: readonly string[],
): Promise<Guard<{ supabase: ServerSupabaseClient; user: User; role: string }>> {
  const { supabase, user, role } = await getSessionProfile();

  if (!user) {
    return { response: unauthorized() };
  }

  if (!hasRole(role, allowedRoles)) {
    return { response: forbidden() };
  }

  if (!supabase) {
    return { response: supabaseNotConfigured() };
  }

  return { supabase, user, role: role ?? "guest" };
}
