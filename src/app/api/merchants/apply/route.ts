import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { readJsonBody } from "@/lib/api/json";
import { withErrorHandling } from "@/lib/api/handler";
import { logError } from "@/lib/observability/log";

const SCOPE = "api/merchants/apply";

export const POST = withErrorHandling(SCOPE, async (request: Request) => {
  const parsed = await readJsonBody<{ businessName?: unknown }>(request, SCOPE);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { businessName } = parsed.data;

  if (typeof businessName !== "string" || businessName.trim().length < 2) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("merchants")
    .select("id")
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (existingError) {
    logError(SCOPE, existingError, { userId: userData.user.id, step: "fetch_existing" });
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ error: "You already have a merchant application" }, { status: 409 });
  }

  const { data: merchant, error } = await supabase
    .from("merchants")
    .insert({ owner_id: userData.user.id, business_name: businessName.trim(), status: "pending" })
    .select("id")
    .single();

  if (error || !merchant) {
    logError(SCOPE, error ?? new Error("insert returned no row"), { userId: userData.user.id, step: "insert_merchant" });
    return NextResponse.json({ error: error?.message ?? "Unable to create merchant application" }, { status: 500 });
  }

  const { error: roleError } = await supabase.from("profiles").update({ role: "merchant" }).eq("id", userData.user.id);

  // The application row exists but the account is left on its old role, so the
  // caller must be told instead of seeing a success they cannot act on.
  if (roleError) {
    logError(SCOPE, roleError, { userId: userData.user.id, merchantId: merchant.id, step: "update_role" });
    return NextResponse.json(
      {
        error: "Your application was created but your account role could not be updated. Please contact support.",
        merchantId: merchant.id,
      },
      { status: 500 },
    );
  }

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "merchant_applied",
    targetType: "merchant",
    targetId: merchant.id,
    metadata: { businessName },
  });

  return NextResponse.json({ ok: true, merchantId: merchant.id });
});
