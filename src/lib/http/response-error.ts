/**
 * Builds an Error from a failed fetch Response. Reading the body defensively
 * matters because a proxy or crashed route can answer with HTML, in which case
 * `res.json()` throws a SyntaxError that masks the real status.
 */
export async function responseError(res: Response, fallback: string): Promise<Error> {
  let message: string | null = null;

  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object") {
      const candidate = (body as { error?: unknown }).error;
      if (typeof candidate === "string" && candidate.length > 0) {
        message = candidate;
      }
    }
  } catch {
    // Non-JSON error payload; fall back to the status line below.
  }

  return new Error(message ?? `${fallback} (HTTP ${res.status})`);
}
