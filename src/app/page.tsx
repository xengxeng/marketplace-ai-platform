import Link from "next/link";

const highlights = [
  "Gmail OTP authentication",
  "Verified merchant onboarding",
  "Reseller customer-gated checkout",
  "Wallet ledger + commission flow",
  "Finance admin approvals",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-700 font-semibold text-white">
            MA
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Marketplace-AI</p>
            <p className="text-xs text-zinc-400">Enterprise commerce platform</p>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm text-zinc-300">
          <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/10">
            Open dashboard
          </Link>
          <Link href="/auth" className="rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-2 font-medium text-white transition hover:opacity-90">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mt-10 grid gap-8 rounded-[2rem] border border-white/10 bg-black/30 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-2xl lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-sm text-red-200">
            Verified commerce • Reseller-led growth • Finance controls
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            A premium marketplace for merchants, resellers, and finance teams.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-300">
            Launch a protected commerce platform with OTP sign-in, customer-gated reseller checkout, merchant verification, wallet-ledger movements, and platform operations built in from day one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full bg-white px-5 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200">
              Explore dashboard
            </Link>
            <Link href="/products" className="rounded-full border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
              Browse marketplace
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Platform capabilities</h2>
          <ul className="mt-5 space-y-3 text-sm text-zinc-300">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
