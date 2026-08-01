import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { AdminOrdersPanel } from "@/components/dashboard/admin-orders-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["admin", "super_admin"];

export default async function AdminDashboardPage() {
  const { role } = await getSessionProfile();

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Platform oversight and moderation</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Manage order fulfillment below. Merchant approvals, system controls, and escalation flows are still on the roadmap.
        </p>
      </div>

      <AdminOrdersPanel />
    </div>
  );
}
