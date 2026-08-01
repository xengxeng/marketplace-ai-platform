import Link from "next/link";

const cards = [
  { title: "Merchant workspace", description: "Manage catalog, inventory, and verification status", href: "/dashboard/merchant" },
  { title: "Reseller workspace", description: "Select customers and manage reseller orders", href: "/dashboard/reseller" },
  { title: "Finance operations", description: "Review payouts, commissions, and approvals", href: "/dashboard/finance" },
  { title: "Admin operations", description: "Moderate marketplace activity and approvals", href: "/dashboard/admin" },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Welcome to your enterprise marketplace workspace</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              The platform is now structured around verified merchants, reseller-led sales, wallet-ledger finance, and admin operations.
            </p>
          </div>
          <Link href="/products" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            Browse products
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
