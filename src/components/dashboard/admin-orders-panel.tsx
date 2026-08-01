"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  customer_id: string;
  reseller_id: string | null;
  status: string;
  total_cents: number;
  created_at: string;
};

function formatPeso(cents: number) {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  paid: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  confirmed: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
  processing: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  shipped: "border-blue-400/30 bg-blue-500/10 text-blue-300",
  delivered: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  fulfilled: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  refunded: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

const ADMIN_TRANSITIONS: Record<string, { status: string; label: string; tone: string }[]> = {
  pending: [
    { status: "confirmed", label: "Confirm order", tone: "border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10" },
    { status: "cancelled", label: "Cancel", tone: "border-red-400/30 text-red-300 hover:bg-red-500/10" },
  ],
  paid: [
    { status: "confirmed", label: "Confirm order", tone: "border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10" },
    { status: "cancelled", label: "Cancel", tone: "border-red-400/30 text-red-300 hover:bg-red-500/10" },
  ],
  confirmed: [
    { status: "processing", label: "Start processing", tone: "border-violet-400/30 text-violet-300 hover:bg-violet-500/10" },
    { status: "cancelled", label: "Cancel", tone: "border-red-400/30 text-red-300 hover:bg-red-500/10" },
  ],
  processing: [
    { status: "shipped", label: "Mark shipped", tone: "border-blue-400/30 text-blue-300 hover:bg-blue-500/10" },
    { status: "cancelled", label: "Cancel", tone: "border-red-400/30 text-red-300 hover:bg-red-500/10" },
  ],
  shipped: [
    { status: "delivered", label: "Mark delivered", tone: "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10" },
    { status: "cancelled", label: "Cancel", tone: "border-red-400/30 text-red-300 hover:bg-red-500/10" },
  ],
  delivered: [
    { status: "refunded", label: "Refund", tone: "border-rose-400/30 text-rose-300 hover:bg-rose-500/10" },
  ],
};

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders");
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Unable to load orders.");
      }

      setOrders(body.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId);

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to update order.");
      }

      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Order fulfillment</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">All orders</h2>
        </div>
        <span className="text-xs font-medium text-zinc-500">{orders.length} total</span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading orders…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No orders yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => {
            const transitions = ADMIN_TRANSITIONS[order.status] ?? [];
            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <p className="font-medium text-white">Order {order.id.slice(0, 8)}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatPeso(order.total_cents)} · {new Date(order.created_at).toLocaleString("en-PH")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_TONE[order.status] ?? "border-white/10 text-zinc-300"}`}>
                    {order.status}
                  </span>

                  {transitions.length > 0 ? (
                    <div className="flex gap-2">
                      {transitions.map((t) => (
                        <button
                          key={t.status}
                          onClick={() => updateStatus(order.id, t.status)}
                          disabled={updatingId === order.id}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-opacity-20 disabled:cursor-not-allowed disabled:opacity-60 ${t.tone}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
