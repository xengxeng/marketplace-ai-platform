import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CommissionRow = { id: string; order_id: string; amount_cents: number; status: string; created_at: string };
type LedgerRow = { entry_type: string; amount_cents: number };

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, display_name, referral_code, status, created_at")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  if (!reseller) {
    return NextResponse.json({ reseller: null, commissions: [], totals: null });
  }

  const { data: commissions, error } = await supabase
    .from("commissions")
    .select("id, order_id, amount_cents, status, created_at")
    .eq("reseller_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: ledger } = await supabase
    .from("wallet_ledger")
    .select("entry_type, amount_cents")
    .eq("profile_id", userData.user.id);

  const rows = (commissions ?? []) as CommissionRow[];
  const sum = (status: string) =>
    rows.filter((row) => row.status === status).reduce((total, row) => total + row.amount_cents, 0);

  // Wallet balance is derived from the ledger rather than stored, so credits
  // and debits stay reconcilable against `approve_commission`.
  const walletCents = ((ledger ?? []) as LedgerRow[]).reduce(
    (total, row) => total + (row.entry_type === "credit" ? row.amount_cents : -row.amount_cents),
    0,
  );

  return NextResponse.json({
    reseller,
    commissions: rows,
    totals: {
      pendingCents: sum("pending"),
      approvedCents: sum("approved"),
      paidCents: sum("paid"),
      walletCents,
      orderCount: rows.length,
    },
  });
}
