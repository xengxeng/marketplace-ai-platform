import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { MerchantProductsPanel } from "@/components/dashboard/merchant-products-panel";
import { MerchantApplyForm } from "@/components/storefront/merchant-apply-form";
import { getSessionProfile } from "@/lib/auth/require-role";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Any authenticated user (already enforced by the dashboard layout) can load
// this page: someone with no merchant record yet needs to reach the apply
// form, so a role check here would create a chicken-and-egg lockout. The
// page's own state (no record / pending / suspended / verified) is the real
// gate on what content and capability the visitor gets.
export default async function MerchantDashboardPage() {
  const { user } = await getSessionProfile();

  const supabase = await createServerSupabaseClient();
  const { data: merchant } = supabase && user
    ? await supabase.from("merchants").select("business_name, status").eq("owner_id", user.id).maybeSingle()
    : { data: null };

  if (!merchant) {
    return <MerchantApplyForm />;
  }

  if (merchant.status === "pending") {
    return (
      <div className="flex flex-col gap-6">
        <ComingSoonPanel
          icon="Store"
          tone="from-amber-500/40 via-orange-600/30"
          eyebrow="Application pending"
          title={`${merchant.business_name} is awaiting review`}
          description="An admin needs to verify your business before your products can go live on the marketplace. This usually takes 1-2 business days. You can prepare your catalog as drafts in the meantime."
          highlights={["Verification in progress"]}
        />
        <MerchantProductsPanel canPublish={false} />
      </div>
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
    <div className="flex flex-col gap-6">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Merchant workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{merchant.business_name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Your business is verified. Products you mark active appear on the marketplace immediately.
        </p>
      </div>
      <MerchantProductsPanel canPublish />
    </div>
  );
}
