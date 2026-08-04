import { NextResponse } from "next/server";
import { logError } from "@/lib/observability/log";

/**
 * Wraps a route handler so an unexpected throw is logged and answered with a
 * JSON error body. Without it, Next.js returns an opaque 500 that clients
 * cannot parse and that leaves no trace of the underlying failure.
 */
export function withErrorHandling<Args extends unknown[]>(
  scope: string,
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      logError(scope, error, { step: "unhandled" });
      return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
    }
  };
}
