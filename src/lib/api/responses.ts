import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return apiError("Not signed in", 401);
}

export function forbidden() {
  return apiError("Forbidden", 403);
}

export function supabaseNotConfigured() {
  return apiError("Supabase is not configured", 500);
}

export function unexpectedError(error: unknown, fallback = "Unknown error") {
  return apiError(errorMessage(error, fallback), 500);
}

/** Wraps a PostgREST list query into `{ [key]: rows }`, or its error into a 500. */
export function listResponse<T>(key: string, result: { data: T[] | null; error: { message: string } | null }) {
  if (result.error) {
    return apiError(result.error.message, 500);
  }

  return NextResponse.json({ [key]: result.data ?? [] });
}
