import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResellerForUser } from "@/lib/reseller/current";

export async function GET(request: Request) {
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

  const search = new URL(request.url).searchParams.get("search")?.trim();

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, address_line, address_city, created_at")
    .eq("reseller_id", reseller.id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customers: data ?? [] });
}

export async function POST(request: Request) {
  const { name, phone, email, addressLine, addressCity } = await request.json();

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
    return NextResponse.json({ error: "Customer phone number is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Customer management is deliberately not gated on verification: a pending
  // reseller builds their book in advance of approval (Module 12, rule 1).
  const reseller = await getResellerForUser(supabase, userData.user.id);
  if (!reseller) {
    return NextResponse.json({ error: "No reseller account" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      reseller_id: reseller.id,
      name: name.trim(),
      phone: phone.trim(),
      email: typeof email === "string" ? email.trim() || null : null,
      address_line: typeof addressLine === "string" ? addressLine.trim() || null : null,
      address_city: typeof addressCity === "string" ? addressCity.trim() || null : null,
    })
    .select("id, name, phone, email, address_line, address_city, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to create customer" }, { status: 500 });
  }

  return NextResponse.json({ customer: data });
}
