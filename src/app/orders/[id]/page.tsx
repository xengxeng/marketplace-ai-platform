import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OrderItemRow = {
  id: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  products: { name: string } | { name: string }[] | null;
};

type StatusEntry = {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function productName(row: OrderItemRow) {
  if (!row.products) return "Unknown product";
  return Array.isArray(row.products) ? row.products[0]?.name ?? "Unknown product" : row.products.name;
}

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <p className="text-sm text-zinc-400">Supabase is not configured yet.</p>
      </main>
    );
  }

  const { data: order } = await supabase.from("orders").select("id, status, total_cents, created_at").eq("id", id).maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price_cents, subtotal_cents, products(name)")
    .eq("order_id", id);

  const { data: history } = await supabase
    .from("order_status_history")
    .select("id, from_status, to_status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const timeline = (history ?? []) as StatusEntry[];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Order confirmed</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Thank you for your order</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Order <span className="text-white">{order.id}</span> · Status{" "}
          <span className="capitalize text-white">{order.status}</span>
        </p>

        <div className="mt-8 space-y-3">
          {(items as OrderItemRow[] | null)?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-medium text-white">{productName(item)}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {formatPeso(item.unit_price_cents)} × {item.quantity}
                </p>
              </div>
              <span className="font-medium text-white">{formatPeso(item.subtotal_cents)}</span>
            </div>
          ))}
        </div>

        {timeline.length > 0 ? (
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Status timeline</p>
            <ol className="mt-4 space-y-2 text-sm text-zinc-400">
              {timeline.map((entry) => (
                <li key={entry.id}>
                  <span className="capitalize text-white">{entry.to_status}</span> ·{" "}
                  {new Date(entry.created_at).toLocaleString("en-PH")}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
          <p className="text-sm text-zinc-400">Total paid</p>
          <p className="text-2xl font-semibold text-white">{formatPeso(order.total_cents)}</p>
        </div>

        <Link
          href="/products"
          className="mt-6 inline-block rounded-full border border-white/10 px-5 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
