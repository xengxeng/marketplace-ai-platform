import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { DataLoadError } from "@/components/dashboard/data-load-error";
import { MerchantApplyForm } from "@/components/storefront/merchant-apply-form";
import { getSessionProfile } from "@/lib/auth/require-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/log";

const SCOPE = "dashboard/merchant";

// Any authenticated user (already enforced by the dashboard layout) can load
// this page: someone with no merchant record yet needs to reach the apply
// form, so a role check here would create a chicken-and-egg lockout. The
// page's own state (no record / pending / suspended / verified) is the real
// gate on what content and capability the visitor gets.
export default async function MerchantDashboardPage() {
  const { user, error: sessionError } = await getSessionProfile();

  if (sessionError) {
    return <DataLoadError title="We couldn't verify your session" message={sessionError} />;
  }

  const supabase = await createServerSupabaseClient();
  const { data: merchant, error: merchantError } = supabase && user
    ? await supabase.from("merchants").select("business_name, status").eq("owner_id", user.id).maybeSingle()
    : { data: null, error: null };

  // A failed lookup used to fall through to the apply form, so an existing
  // merchant was invited to re-apply and then rejected with a 409.
  if (merchantError) {
    logError(SCOPE, merchantError, { step: "fetch_merchant", userId: user?.id });
    return <DataLoadError title="We couldn't load your merchant profile" message={merchantError.message} />;
  }

  if (!merchant) {
    return <MerchantApplyForm />;
  }

  if (merchant.status === "pending") {
    return (
      <ComingSoonPanel
        icon="Store"
        tone="from-amber-500/40 via-orange-600/30"
        eyebrow="Application pending"
        title={`${merchant.business_name} is awaiting review`}
        description="An admin needs to verify your business before your products can go live on the marketplace. This usually takes 1-2 business days."
        highlights={["Verification in progress"]}
      />
    );
  }

  if (merchant.status === "suspended") {
    return (
      <ComingSoonPanel
        icon="Store"
        tone="from-red-500/40 via-rose-700/30"
        eyebrow="Account suspended"
        title={`${merchant.business_name} has been suspended`}
        description="Contact platform support to resolve this before you can sell again."
        highlights={["Suspended"]}
      />
    );
  }

  return (
    <ComingSoonPanel
      icon="Store"
      tone="from-red-500/40 via-rose-600/30"
      eyebrow="Merchant workspace"
      title={`${merchant.business_name} — catalog, inventory, and verification controls`}
      description="This section will host product management, onboarding review, and merchant status workflows."
      highlights={["Product catalog", "Verification queue", "Inventory sync", "Staff access"]}
    />
  );
}
