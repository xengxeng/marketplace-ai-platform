import { ResellerPanel } from "@/components/dashboard/reseller-panel";

// Deliberately no role gate: a guest reaching this page needs the registration
// form, and registering is what grants the `reseller` role in the first place.
// The panel's own state (registered / suspended / active) is the real gate.
export default function ResellerDashboardPage() {
  return <ResellerPanel />;
}
