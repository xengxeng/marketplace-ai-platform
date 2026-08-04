import { NextResponse } from "next/server";
import { logError } from "@/lib/observability/log";

export type JsonBodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Parses a JSON request body without letting a malformed payload escape as an
 * unhandled exception (which Next.js turns into an opaque 500).
 */
export async function readJsonBody<T>(request: Request, scope: string): Promise<JsonBodyResult<T>> {
  try {
    const data = (await request.json()) as T;

    if (data === null || typeof data !== "object") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 }),
      };
    }

    return { ok: true, data };
  } catch (error) {
    logError(scope, error, { reason: "invalid_json_body" });
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
