import type { z } from "zod";

/** First zod issue, formatted for an API error envelope. */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
