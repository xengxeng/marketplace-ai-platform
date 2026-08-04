import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { AdminOrdersPanel } from "@/components/dashboard/admin-orders-panel";
import { MerchantApprovalPanel } from "@/components/dashboard/merchant-approval-panel";
import { ActivityLogPanel } from "@/components/dashboard/activity-log-panel";
import { getSessionProfile } from "@/lib/auth/require-role";
import { hasRole, PLATFORM_ADMIN_ROLES } from "@/lib/auth/roles";

export default async function AdminDashboardPage() {
  const { supabase, role } = await getSessionProfile();

  if (!hasRole(role, PLATFORM_ADMIN_ROLES)) {
    return <AccessRestricted requiredRoles={PLATFORM_ADMIN_ROLES} />;
  }

  const { data: logs } = supabase
    ? await supabase
        .from("activity_logs")
        .select("id, action, target_type, target_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Platform oversight and moderation</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Manage order fulfillment, merchant verification, and review recent activity below. System controls and escalation flows are still on the roadmap.
        </p>
      </div>

      <AdminOrdersPanel />
      <MerchantApprovalPanel />
      <ActivityLogPanel logs={logs ?? []} />
    </div>
  );
}
