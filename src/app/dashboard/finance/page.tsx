import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["finance_admin", "admin", "super_admin"];

export default async function FinanceDashboardPage() {
  const { role } = await getSessionProfile();

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
  }

  return (
    <ComingSoonPanel
      icon="Wallet"
      tone="from-emerald-500/40 via-teal-600/30"
      eyebrow="Finance workspace"
      title="Payouts, ledgers, and approval queues"
      description="This module will govern wallet-ledger events, commission approvals, and payout governance."
      highlights={["Wallet ledger", "Payout approvals", "Commission engine", "Reconciliation"]}
    />
  );
}
