import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["reseller", "admin", "super_admin"];

export default async function ResellerDashboardPage() {
  const { role } = await getSessionProfile();

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
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
