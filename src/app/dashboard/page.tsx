import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardOverviewClient, type ActivityEntry, type Metric } from "@/components/dashboard/dashboard-overview-client";
import { formatWholePeso, pluralize, shortId, timeAgo } from "@/lib/format";

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

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", userData.user.id).maybeSingle();
      const hasRealName = profile?.full_name && !profile.full_name.includes("@");
      greetingName = (hasRealName ? profile!.full_name!.split(" ")[0] : profile?.email?.split("@")[0]) || "there";
    }

    const [{ data: orders }, { data: merchants }] = await Promise.all([
      supabase.from("orders").select("id, status, total_cents, created_at").order("created_at", { ascending: false }),
      supabase.from("merchants").select("id, status"),
    ]);

    const allOrders = orders ?? [];
    const totalRevenueCents = allOrders.reduce((sum, order) => sum + (order.total_cents ?? 0), 0);
    const pendingCount = allOrders.filter((order) => order.status === "pending").length;
    const verifiedMerchantCount = (merchants ?? []).filter((merchant) => merchant.status === "verified").length;

    metrics = [
      {
        label: "Total Revenue",
        value: formatWholePeso(totalRevenueCents),
        changeLabel: pluralize(allOrders.length, "order"),
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
      title: `Order ${shortId(order.id)}`,
      detail: `${formatWholePeso(order.total_cents ?? 0)} · ${order.status}`,
      time: timeAgo(order.created_at),
    }));
  }

  return <DashboardOverviewClient greetingName={greetingName} metrics={metrics} activity={activity} />;
}
