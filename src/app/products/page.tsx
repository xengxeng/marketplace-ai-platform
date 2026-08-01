const products = [
  { name: "Ruby Essentials Kit", merchant: "Northstar Goods", price: "₱1,250" },
  { name: "Aurora Lighting Bundle", merchant: "Nova Supply", price: "₱3,400" },
  { name: "Crimson Apparel Set", merchant: "Redline Retail", price: "₱1,980" },
];

export default function ProductsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Marketplace</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Discover products from verified merchants</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <div key={product.name} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
              <div className="h-28 rounded-[1rem] bg-gradient-to-br from-red-500/20 to-rose-900/40" />
              <h2 className="mt-4 text-lg font-semibold text-white">{product.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">{product.merchant}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-white">{product.price}</span>
                <button className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10">
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
