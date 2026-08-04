import Link from "next/link";
import { CustomerBookPanel } from "@/components/reseller/customer-book-panel";
import { ResellerApplyForm } from "@/components/reseller/reseller-apply-form";
import { getSessionProfile } from "@/lib/auth/require-role";
import { getResellerForUser } from "@/lib/reseller/current";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const BANNER: Record<string, { tone: string; copy: string }> = {
  unverified: {
    tone: "border-white/10 bg-white/5 text-zinc-300",
    copy: "Verify your identity to start earning commission.",
  },
  pending: {
    tone: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    copy:
      "Your verification is under review. You can add and manage customers now — you'll be able to check out for them as soon as you're approved.",
  },
  approved: {
    tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    copy: "You're verified. You can check out on behalf of your customers and earn commission.",
  },
  rejected: {
    tone: "border-red-400/30 bg-red-500/10 text-red-200",
    copy: "Your verification was not approved. Contact support to proceed.",
  },
  resubmission_required: {
    tone: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    copy: "We need a few corrections before we can approve you.",
  },
};

// Like the merchant page, any authenticated visitor can load this route: a user
// with no reseller record has to be able to reach the apply form.
export default async function ResellerDashboardPage() {
  const { user } = await getSessionProfile();

  const supabase = await createServerSupabaseClient();
  const reseller = supabase && user ? await getResellerForUser(supabase, user.id) : null;

  if (!reseller || !supabase || !user) {
    return <ResellerApplyForm />;
  }

  const [{ count: customerCount }, { data: commissions }, { data: ledger }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("reseller_id", reseller.id),
    supabase.from("commissions").select("amount_cents, status").eq("reseller_id", user.id),
    supabase.from("wallet_ledger").select("entry_type, amount_cents").eq("profile_id", user.id),
  ]);

  const pendingCommissionCents = (commissions ?? [])
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount_cents, 0);

  const walletCents = (ledger ?? []).reduce(
    (sum, row) => sum + (row.entry_type === "credit" ? row.amount_cents : -row.amount_cents),
    0,
  );

  const banner = BANNER[reseller.verification_status] ?? BANNER.unverified;

  return (
    <div className="space-y-6">
      <div className={`rounded-[1.5rem] border p-5 text-sm ${banner.tone}`}>
        <p className="font-medium capitalize">{reseller.verification_status.replace(/_/g, " ")}</p>
        <p className="mt-1">{banner.copy}</p>
        {reseller.review_note ? <p className="mt-2 text-xs opacity-80">Reviewer note: {reseller.review_note}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Customers", String(customerCount ?? 0)],
          ["Pending commission", formatPeso(pendingCommissionCents)],
          ["Wallet balance", formatPeso(walletCents)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {reseller.verification_status === "approved" ? (
        <Link
          href="/products"
          className="inline-block rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Browse catalog
        </Link>
      ) : null}

      <CustomerBookPanel />
    </div>
  );
}
