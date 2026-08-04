/**
 * Order lifecycle. `fulfilled` is the legacy terminal status from before the
 * full chain existed; it is still accepted so historical orders keep resolving,
 * but nothing transitions *into* it any more (`delivered` replaced it).
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "fulfilled", "cancelled"];

/** Allowed next statuses per current status. An order can be cancelled any time before shipping. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "confirmed", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  fulfilled: [],
  cancelled: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminal(status: string) {
  return TERMINAL_STATUSES.includes(status as OrderStatus);
}

export function canTransition(from: string, to: string) {
  return isOrderStatus(from) && isOrderStatus(to) && ORDER_TRANSITIONS[from].includes(to);
}

/** Customer-facing notification copy, or null for transitions we stay quiet about. */
export function statusNotification(status: OrderStatus, orderId: string) {
  const reference = orderId.slice(0, 8);

  const copy: Partial<Record<OrderStatus, { title: string; body: string }>> = {
    confirmed: { title: "Order confirmed", body: `Your order ${reference} has been confirmed.` },
    processing: { title: "Order being prepared", body: `Your order ${reference} is being prepared.` },
    shipped: { title: "Order shipped", body: `Your order ${reference} is on the way.` },
    delivered: { title: "Order delivered", body: `Your order ${reference} was delivered. Enjoy!` },
    fulfilled: { title: "Order fulfilled", body: `Your order ${reference} has been fulfilled.` },
    cancelled: { title: "Order cancelled", body: `Your order ${reference} was cancelled.` },
  };

  return copy[status] ?? null;
}
