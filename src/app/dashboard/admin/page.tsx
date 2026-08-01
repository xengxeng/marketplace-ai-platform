import { AccessRestricted } from "@/components/dashboard/access-restricted";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { getSessionProfile } from "@/lib/auth/require-role";

const ALLOWED_ROLES = ["admin", "super_admin"];

export default async function AdminDashboardPage() {
  const { role } = await getSessionProfile();

  if (!ALLOWED_ROLES.includes(role ?? "")) {
    return <AccessRestricted requiredRoles={ALLOWED_ROLES} />;
  }

  return (
    <ComingSoonPanel
      icon="ShieldCheck"
      tone="from-amber-500/40 via-orange-600/30"
      eyebrow="Admin workspace"
      title="Platform oversight and moderation"
      description="This space will manage merchant approvals, system controls, and escalation flows."
      highlights={["Merchant approvals", "System controls", "Escalations", "Audit logs"]}
    />
  );
}
