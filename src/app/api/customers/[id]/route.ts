import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResellerForUser } from "@/lib/reseller/current";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, phone, email, addressLine, addressCity } = await request.json();

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const reseller = await getResellerForUser(supabase, userData.user.id);
  if (!reseller) {
    return NextResponse.json({ error: "No reseller account" }, { status: 403 });
  }

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };

  if (typeof name === "string") {
    if (name.trim().length < 2) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    patch.name = name.trim();
  }

  if (typeof phone === "string") {
    if (phone.trim().length < 7) {
      return NextResponse.json({ error: "Customer phone number is required" }, { status: 400 });
    }
    patch.phone = phone.trim();
  }

  if (typeof email === "string") patch.email = email.trim() || null;
  if (typeof addressLine === "string") patch.address_line = addressLine.trim() || null;
  if (typeof addressCity === "string") patch.address_city = addressCity.trim() || null;

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("reseller_id", reseller.id)
    .select("id, name, phone, email, address_line, address_city, created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ customer: data });
}
