"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { responseError } from "@/lib/http/response-error";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  stock: number;
  quantity: number;
  subtotalCents: number;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function loadCart() {
    setLoading(true);
    setError("");

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

  useEffect(() => {
    loadCart();
  }, []);

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);

    try {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        throw await responseError(res, "Unable to remove item.");
      }
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 sm:px-8 lg:px-10">
      <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-2xl shadow-red-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Your cart</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Review your items</h1>

        {loading ? (
          <p className="mt-8 text-sm text-zinc-400">Loading cart…</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-300">{error}</p>
        ) : items.length === 0 ? (
          <div className="mt-8 flex flex-col items-start gap-3">
            <p className="text-sm text-zinc-400">Your cart is empty.</p>
            <Link href="/products" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/10">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[1.2rem] border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatPeso(item.priceCents)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-white">{formatPeso(item.subtotalCents)}</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingId === item.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-sm text-zinc-400">Total</p>
                <p className="text-2xl font-semibold text-white">{formatPeso(totalCents)}</p>
              </div>
              <Link
                href="/checkout"
                className="rounded-full bg-gradient-to-r from-red-500 to-rose-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Proceed to checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
