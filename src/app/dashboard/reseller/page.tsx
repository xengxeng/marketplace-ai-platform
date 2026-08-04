import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { getSessionProfile } from "@/lib/auth/require-role";
import { hasRole, RESELLER_ROLES } from "@/lib/auth/roles";

export default async function ResellerDashboardPage() {
  const { role } = await getSessionProfile();

  if (!hasRole(role, RESELLER_ROLES)) {
    return <AccessRestricted requiredRoles={RESELLER_ROLES} />;
  }

  return (
    <ComingSoonPanel
      icon="Users"
      tone="from-violet-500/40 via-fuchsia-600/30"
      eyebrow="Reseller workspace"
      title="Customer and sales operations"
      description="This area will support reseller-led customer assignment, order tracking, and commission review."
      highlights={["Customer CRM", "Order tracking", "Commission review", "Wallet balance"]}
    />
  );
}
