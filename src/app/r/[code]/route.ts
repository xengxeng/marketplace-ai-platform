import { NextResponse } from "next/server";
import { REFERRAL_COOKIE, REFERRAL_MAX_AGE, normalizeReferralCode } from "@/lib/resellers/referral";

/**
 * Referral entry point. Stores the code and bounces the visitor to the
 * storefront; attribution is resolved server-side at checkout so a bad or
 * retired code never blocks browsing.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = normalizeReferralCode(code);

  const response = NextResponse.redirect(new URL(normalized ? "/products" : "/", request.url));

  if (normalized) {
    response.cookies.set(REFERRAL_COOKIE, normalized, {
      maxAge: REFERRAL_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
