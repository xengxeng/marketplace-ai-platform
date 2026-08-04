import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { generateReferralCode } from "@/lib/resellers/referral";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(request: Request) {
  let displayName: unknown;
  try {
    ({ displayName } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof displayName !== "string" || displayName.trim().length < 2) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("resellers")
    .select("id")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You are already registered as a reseller" }, { status: 409 });
  }

  // `referral_code` is unique, so a collision surfaces as an insert error
  // rather than silently sharing a code — retry with a fresh one.
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const referralCode = generateReferralCode();

    const { data: reseller, error } = await supabase
      .from("resellers")
      .insert({
        profile_id: userData.user.id,
        display_name: displayName.trim(),
        referral_code: referralCode,
        status: "active",
      })
      .select("id, referral_code")
      .single();

    if (!error && reseller) {
      await supabase.from("profiles").update({ role: "reseller" }).eq("id", userData.user.id);

      await logActivity(supabase, {
        actorId: userData.user.id,
        action: "reseller_registered",
        targetType: "reseller",
        targetId: reseller.id,
        metadata: { referralCode: reseller.referral_code },
      });

      return NextResponse.json({ ok: true, resellerId: reseller.id, referralCode: reseller.referral_code });
    }

    if (!error?.message.includes("resellers_referral_code_key")) {
      return NextResponse.json({ error: error?.message ?? "Unable to register as a reseller" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Could not allocate a referral code, please retry" }, { status: 503 });
}
