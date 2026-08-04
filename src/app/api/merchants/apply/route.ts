import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { guardFailed, requireUser } from "@/lib/api/guards";
import { logActivity } from "@/lib/activity/log";

export async function POST(request: Request) {
  const { businessName } = await request.json();

  if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2) {
    return apiError("Business name is required", 400);
  }

  const guard = await requireUser();

  if (guardFailed(guard)) {
    return guard.response;
  }

  const { supabase, user } = guard;

  const { data: existing } = await supabase.from("merchants").select("id").eq("owner_id", user.id).maybeSingle();

  if (existing) {
    return apiError("You already have a merchant application", 409);
  }

  const { data: merchant, error } = await supabase
    .from("merchants")
    .insert({ owner_id: user.id, business_name: businessName.trim(), status: "pending" })
    .select("id")
    .single();

  if (error || !merchant) {
    return apiError(error?.message ?? "Unable to create merchant application", 500);
  }

  await supabase.from("profiles").update({ role: "merchant" }).eq("id", user.id);

  await logActivity(supabase, {
    actorId: user.id,
    action: "merchant_applied",
    targetType: "merchant",
    targetId: merchant.id,
    metadata: { businessName },
  });

  return NextResponse.json({ ok: true, merchantId: merchant.id });
}
