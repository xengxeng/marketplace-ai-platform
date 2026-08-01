import Link from "next/link";

const metrics = [
  { label: "Total Revenue", value: "$248K", change: "+12.4%", tone: "text-emerald-300" },
  { label: "Active Users", value: "18.2K", change: "+8.1%", tone: "text-sky-300" },
  { label: "New Customers", value: "1,284", change: "+5.7%", tone: "text-violet-300" },
  { label: "Pending Orders", value: "142", change: "-2.3%", tone: "text-amber-300" },
];

const activity = [
  { title: "Merchant verification approved", time: "4 min ago", detail: "Northstar Foods completed onboarding" },
  { title: "Reseller order dispatched", time: "14 min ago", detail: "Aubrey Retail moved 24 cartons" },
  { title: "Finance payout queued", time: "34 min ago", detail: "Commission batch prepared for review" },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <div className="grid lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-white/10 bg-white/5 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 font-semibold text-white">
                F
              </div>
              <div>
                <p className="text-sm font-semibold text-white">FOODIFY</p>
                <p className="text-xs text-zinc-400">Operations Center</p>
              </div>
            </div>

            <div className="mt-8 space-y-2 text-sm text-zinc-300">
              {[
                ["Overview", "/dashboard"],
                ["Merchants", "/dashboard/merchant"],
                ["Resellers", "/dashboard/reseller"],
                ["Finance", "/dashboard/finance"],
                ["Admin", "/dashboard/admin"],
              ].map(([label, href]) => (
                <Link key={label} href={href as string} className="flex items-center rounded-2xl border border-white/10 bg-black/20 px-3 py-3 transition hover:bg-white/10">
                  {label}
                </Link>
              ))}
            </div>
          </aside>

          <section className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Foodify dashboard</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">Welcome back, Aubrey</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-400">Your enterprise food marketplace is performing strongly across merchants, resellers, and finance operations.</p>
              </div>
              <Link href="/products" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                Browse products
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-zinc-400">{metric.label}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-2xl font-semibold text-white">{metric.value}</p>
                    <span className={`text-sm ${metric.tone}`}>{metric.change}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-red-500/10 to-rose-900/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400">Live operations</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">Marketplace pulse</h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Online</div>
                </div>
                <div className="mt-5 h-40 rounded-[1.2rem] border border-white/10 bg-black/20" />
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent activity</h2>
                  <span className="text-sm text-zinc-400">Live</span>
                </div>
                <div className="mt-4 space-y-3">
                  {activity.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-red-300">{item.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
