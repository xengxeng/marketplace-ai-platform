import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";

export async function POST(request: Request) {
  const { fullName, phoneNumber, addressLine, addressCity, addressProvince, addressPostalCode } =
    await request.json();

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length < 7) {
    return NextResponse.json({ error: "A contact phone number is required" }, { status: 400 });
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
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a reseller application" }, { status: 409 });
  }

  const { data: reseller, error } = await supabase
    .from("resellers")
    .insert({
      user_id: userData.user.id,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      address_line: typeof addressLine === "string" ? addressLine.trim() || null : null,
      address_city: typeof addressCity === "string" ? addressCity.trim() || null : null,
      address_province: typeof addressProvince === "string" ? addressProvince.trim() || null : null,
      address_postal_code: typeof addressPostalCode === "string" ? addressPostalCode.trim() || null : null,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (error || !reseller) {
    return NextResponse.json({ error: error?.message ?? "Unable to create reseller application" }, { status: 500 });
  }

  await supabase.from("profiles").update({ role: "reseller" }).eq("id", userData.user.id);

  await logActivity(supabase, {
    actorId: userData.user.id,
    action: "reseller_applied",
    targetType: "reseller",
    targetId: reseller.id,
    metadata: { fullName },
  });

  return NextResponse.json({ ok: true, resellerId: reseller.id });
}
