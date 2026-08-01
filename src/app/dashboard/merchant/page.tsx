import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["merchant", "admin", "super_admin"];

export default async function MerchantDashboardPage() {
  const { role } = await getSessionProfile();

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
  }

  return (
    <ComingSoonPanel
      icon="Store"
      tone="from-red-500/40 via-rose-600/30"
      eyebrow="Merchant workspace"
      title="Catalog, inventory, and verification controls"
      description="This section will host product management, onboarding review, and merchant status workflows."
      highlights={["Product catalog", "Verification queue", "Inventory sync", "Staff access"]}
    />
  );
}
