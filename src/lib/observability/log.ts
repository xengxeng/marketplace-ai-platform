type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function describe(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (error && typeof error === "object") {
    const { message, code, details, hint } = error as ErrorLike;
    return {
      message: typeof message === "string" ? message : JSON.stringify(error),
      ...(code === undefined ? {} : { code }),
      ...(details === undefined ? {} : { details }),
      ...(hint === undefined ? {} : { hint }),
    };
  }

  return { message: String(error) };
}

/**
 * Logs a server-side failure with enough context to trace it back to a request.
 * Use for errors that are handled (returned to the caller or tolerated) so they
 * remain visible in server logs instead of disappearing.
 */
export function logError(scope: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[${scope}]`, { ...describe(error), ...context });
}
