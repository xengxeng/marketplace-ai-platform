"use client";

import { fetchJson } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatDateTime, formatPeso, shortId } from "@/lib/format";
import { statusBadgeClass } from "@/lib/ui/status";
import { Panel, PanelActionButton, PanelHeader, PanelMessage, PanelRow } from "./panel";

type Order = {
  id: string;
  customer_id: string;
  reseller_id: string | null;
  status: string;
  total_cents: number;
  created_at: string;
};

const OPEN_STATUSES = ["pending", "paid"];

const loadOrders = () => fetchJson<{ orders: Order[] }>("/api/orders", { fallbackError: "Unable to load orders." });

export function AdminOrdersPanel() {
  const { data, loading, error, pendingId, mutate } = useApiResource(loadOrders, "Unable to load orders.");

  const orders = data?.orders ?? [];

  function updateStatus(orderId: string, status: string) {
    return mutate(
      orderId,
      () =>
        fetchJson(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          json: { status },
          fallbackError: "Unable to update order.",
        }),
      "Unable to update order.",
    );
  }

  return (
    <Panel>
      <PanelHeader eyebrow="Order fulfillment" title="All orders" meta={`${orders.length} total`} />

      {loading ? (
        <PanelMessage>Loading orders…</PanelMessage>
      ) : error ? (
        <PanelMessage tone="danger">{error}</PanelMessage>
      ) : orders.length === 0 ? (
        <PanelMessage>No orders yet.</PanelMessage>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <PanelRow key={order.id}>
              <div>
                <p className="font-medium text-white">Order {shortId(order.id)}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {formatPeso(order.total_cents)} · {formatDateTime(order.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={statusBadgeClass(order.status)}>{order.status}</span>

                {OPEN_STATUSES.includes(order.status) ? (
                  <div className="flex gap-2">
                    <PanelActionButton
                      tone="positive"
                      onClick={() => updateStatus(order.id, "fulfilled")}
                      disabled={pendingId === order.id}
                    >
                      Mark fulfilled
                    </PanelActionButton>
                    <PanelActionButton
                      tone="negative"
                      onClick={() => updateStatus(order.id, "cancelled")}
                      disabled={pendingId === order.id}
                    >
                      Cancel
                    </PanelActionButton>
                  </div>
                ) : null}
              </div>
            </PanelRow>
          ))}
        </div>
      )}
    </Panel>
  );
}
