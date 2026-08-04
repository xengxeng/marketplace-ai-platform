import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { relatedRecord } from "@/lib/supabase/relations";
import { formatPeso } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  stock_int: number;
  merchants: { business_name: string } | { business_name: string }[] | null;
};

function merchantName(row: ProductRow) {
  return relatedRecord(row.merchants)?.business_name ?? "Unknown merchant";
}

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: products, error } = supabase
    ? await supabase
        .from("products")
        .select("id, name, description, category, price_cents, stock_int, merchants(business_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Marketplace</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Discover products from verified merchants</h1>
          </div>
          <Link href="/cart" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
            View cart
          </Link>
        </div>

        {!supabase ? (
          <p className="mt-8 text-sm text-zinc-400">Supabase is not configured yet.</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-300">Unable to load products: {error.message}</p>
        ) : !products || products.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-400">No products are available yet.</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {(products as ProductRow[]).map((product) => (
              <div key={product.id} className="flex flex-col rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
                <div className="flex h-28 items-center justify-center rounded-[1rem] bg-gradient-to-br from-red-500/20 to-rose-900/40 text-xs uppercase tracking-[0.2em] text-white/50">
                  {product.category ?? "Product"}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{product.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{merchantName(product)}</p>
                {product.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{product.description}</p>
                ) : null}
                <div className="mt-4 flex flex-1 items-end justify-between">
                  <span className="text-white">{formatPeso(product.price_cents)}</span>
                  <AddToCartButton productId={product.id} inStock={product.stock_int > 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
