import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardOverviewClient, type ActivityEntry, type Metric } from "@/components/dashboard/dashboard-overview-client";
import { logError } from "@/lib/observability/log";

const SCOPE = "dashboard/overview";

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  let metrics: Metric[] = [
    { label: "Total Revenue", value: "₱0", changeLabel: "—", up: true, icon: "revenue", glow: "from-emerald-500/30" },
    { label: "Total Orders", value: "0", changeLabel: "—", up: true, icon: "orders", glow: "from-sky-500/30" },
    { label: "Active Merchants", value: "0", changeLabel: "—", up: true, icon: "merchants", glow: "from-violet-500/30" },
    { label: "Pending Orders", value: "0", changeLabel: "—", up: true, icon: "pending", glow: "from-amber-500/30" },
  ];
  let activity: ActivityEntry[] = [];
  let greetingName = "there";
  let dataError: string | null = null;

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError) {
        logError(SCOPE, profileError, { step: "fetch_profile", userId: userData.user.id });
      }

      const hasRealName = profile?.full_name && !profile.full_name.includes("@");
      greetingName = (hasRealName ? profile!.full_name!.split(" ")[0] : profile?.email?.split("@")[0]) || "there";
    }

    const [{ data: orders, error: ordersError }, { data: merchants, error: merchantsError }] = await Promise.all([
      supabase.from("orders").select("id, status, total_cents, created_at").order("created_at", { ascending: false }),
      supabase.from("merchants").select("id, status"),
    ]);

    // Rendering ₱0 / 0 for a failed query presents an outage as real business
    // data, so the failure is reported alongside whatever did load.
    const queryError = ordersError ?? merchantsError;
    if (queryError) {
      logError(SCOPE, queryError, { step: ordersError ? "fetch_orders" : "fetch_merchants" });
      dataError = queryError.message;
    }

    const allOrders = orders ?? [];
    const totalRevenueCents = allOrders.reduce((sum, order) => sum + (order.total_cents ?? 0), 0);
    const pendingCount = allOrders.filter((order) => order.status === "pending").length;
    const verifiedMerchantCount = (merchants ?? []).filter((merchant) => merchant.status === "verified").length;

    metrics = [
      {
        label: "Total Revenue",
        value: formatPeso(totalRevenueCents),
        changeLabel: `${allOrders.length} order${allOrders.length === 1 ? "" : "s"}`,
        up: true,
        icon: "revenue",
        glow: "from-emerald-500/30",
      },
      {
        label: "Total Orders",
        value: String(allOrders.length),
        changeLabel: "all time",
        up: true,
        icon: "orders",
        glow: "from-sky-500/30",
      },
      {
        label: "Active Merchants",
        value: String(verifiedMerchantCount),
        changeLabel: "verified",
        up: true,
        icon: "merchants",
        glow: "from-violet-500/30",
      },
      {
        label: "Pending Orders",
        value: String(pendingCount),
        changeLabel: pendingCount > 0 ? "needs review" : "all clear",
        up: pendingCount === 0,
        icon: "pending",
        glow: "from-amber-500/30",
      },
    ];

    activity = allOrders.slice(0, 5).map((order) => ({
      title: `Order ${order.id.slice(0, 8)}`,
      detail: `${formatPeso(order.total_cents ?? 0)} · ${order.status}`,
      time: timeAgo(order.created_at),
    }));
  }

  return <DashboardOverviewClient greetingName={greetingName} metrics={metrics} activity={activity} dataError={dataError} />;
}
