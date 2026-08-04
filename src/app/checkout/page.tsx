"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { responseError } from "@/lib/http/response-error";

type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  subtotalCents: number;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCart() {
      try {
        const res = await fetch("/api/cart");

        if (!res.ok) {
          throw await responseError(res, "Unable to load cart.");
        }

        const body = await res.json();

        setItems(body.items ?? []);
        setTotalCents(body.totalCents ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load cart.");
      } finally {
        setLoading(false);
      }
    }

    loadCart();
  }, []);

  async function handlePlaceOrder() {
    setPlacing(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", { method: "POST" });

      if (!res.ok) {
        throw await responseError(res, "Unable to place order.");
      }

      const body = await res.json();

      if (!body.orderId) {
        throw new Error("The order was not confirmed. Check your orders before trying again.");
      }

      router.push(`/orders/${body.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
      setPlacing(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Checkout</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Confirm your order</h1>

        {loading ? (
          <p className="mt-8 text-sm text-zinc-400">Loading order summary…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-400">Your cart is empty — nothing to check out.</p>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">Qty {item.quantity}</p>
                  </div>
                  <span className="font-medium text-white">{formatPeso(item.subtotalCents)}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <p className="text-sm text-zinc-400">Order total</p>
              <p className="text-2xl font-semibold text-white">{formatPeso(totalCents)}</p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
          </>
        )}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
