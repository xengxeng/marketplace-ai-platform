import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { DataLoadError } from "@/components/dashboard/data-load-error";
import { FinancePanel } from "@/components/dashboard/finance-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["finance_admin", "admin", "super_admin"];

export default async function FinanceDashboardPage() {
  const { role, error } = await getSessionProfile();

  if (error) {
    return <DataLoadError title="We couldn't check your access" message={error} />;
  }

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Finance workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Payouts, ledgers, and approval queues</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Approve reseller commissions below to credit their wallet. Refund/withdrawal/top-up queues are still on the roadmap.
        </p>
      </div>

      <FinancePanel />
    </div>
  );
}
