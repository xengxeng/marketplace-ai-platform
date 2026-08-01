"use client";

import { useEffect, useState } from "react";

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};

type StatusHistory = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string;
  created_at: string;
};

type Order = {
  id: string;
  customer_id: string;
  status: string;
  total_cents: number;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  history: StatusHistory[];
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
  cancelled: "border-red-400/30 bg-red-500/10 text-red-300",
  refunded: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

// Transitions available to merchants for each current status
const MERCHANT_TRANSITIONS: Record<string, { status: string; label: string; tone: string }[]> = {
  pending: [
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
};

export function MerchantOrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [trackingModal, setTrackingModal] = useState<{ orderId: string; toStatus: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/merchant/orders");
      const body = await res.json();

      if (!res.ok) throw new Error(body.error ?? "Unable to load orders.");
      setOrders(body.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

async function transition(orderId: string, toStatus: string, note?: string, tracking?: string, crr?: string) {
    setActionId(orderId);

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: toStatus, note: note ?? null, tracking_number: tracking ?? null, carrier: crr ?? null }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Unable to update order.");
      }

      setTrackingModal(null);
      setTrackingNumber("");
      setCarrier("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update order.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-300">Order fulfillment</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Incoming orders</h2>
        </div>
        <span className="text-xs font-medium text-zinc-500">{orders.length} total</span>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No orders containing your products yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => {
            const transitions = MERCHANT_TRANSITIONS[order.status] ?? [];
            return (
              <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">Order {order.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {formatPeso(order.total_cents)} · {order.items.length} item{order.items.length === 1 ? "" : "s"} · {new Date(order.created_at).toLocaleString("en-PH")}
                    </p>
                    {order.tracking_number && order.carrier ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Tracking: {order.carrier} {order.tracking_number}
                      </p>
                    ) : null}
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
                            onClick={() => {
                              if (t.status === "shipped") {
                                setTrackingModal({ orderId: order.id, toStatus: t.status });
                              } else {
                                transition(order.id, t.status);
                              }
                            }}
                            disabled={actionId === order.id}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${t.tone}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Order items list */}
                {order.items.length > 0 ? (
                  <div className="border-t border-white/10 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Products in this order</p>
                    <div className="space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">
                            {item.product_id.slice(0, 8)} × {item.quantity}
                          </span>
                          <span className="text-zinc-400">{formatPeso(item.subtotal_cents)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Status history */}
                {order.history.length > 0 ? (
                  <div className="border-t border-white/10 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Status history</p>
                    <div className="space-y-1">
                      {order.history.map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="capitalize">{h.from_status ?? "—"}</span>
                          <span className="text-zinc-600">→</span>
                          <span className="capitalize text-zinc-300">{h.to_status}</span>
                          <span className="ml-auto">{new Date(h.created_at).toLocaleString("en-PH")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking info modal */}
      {trackingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Mark order as shipped</h3>
            <p className="mt-1 text-sm text-zinc-400">Enter tracking details to notify the customer.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300">Carrier</label>
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g. J&T, LBC, 2GO"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-400/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300">Tracking number</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. PH123456789"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-400/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setTrackingModal(null)}
                className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => transition(trackingModal.orderId, trackingModal.toStatus, undefined, trackingNumber, carrier)}
                disabled={!carrier.trim() || !trackingNumber.trim() || actionId === trackingModal.orderId}
                className="flex-1 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm shipment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
