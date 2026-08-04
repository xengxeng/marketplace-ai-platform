import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  canTransition,
  isOrderStatus,
  isTerminal,
  statusNotification,
} from "@/lib/orders/status";

describe("order status chain", () => {
  it("declares transitions for every status", () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it("never transitions out of a terminal status", () => {
    for (const status of ORDER_STATUSES.filter(isTerminal)) {
      expect(ORDER_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("only ever targets known statuses", () => {
    for (const targets of Object.values(ORDER_TRANSITIONS)) {
      expect(targets.every(isOrderStatus)).toBe(true);
    }
  });

  it("walks the happy path end to end", () => {
    const chain = ["pending", "confirmed", "processing", "shipped", "delivered"];

    for (let index = 0; index < chain.length - 1; index += 1) {
      expect(canTransition(chain[index], chain[index + 1])).toBe(true);
    }
  });

  it.each([
    ["pending", "delivered"],
    ["shipped", "processing"],
    ["delivered", "cancelled"],
    ["cancelled", "pending"],
    ["fulfilled", "delivered"],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("allows cancelling any time before shipping, and never after", () => {
    expect(["pending", "paid", "confirmed", "processing"].every((s) => canTransition(s, "cancelled"))).toBe(true);
    expect(["shipped", "delivered"].some((s) => canTransition(s, "cancelled"))).toBe(false);
  });

  it("rejects unknown statuses on both sides", () => {
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(canTransition("pending", "refunded")).toBe(false);
    expect(isOrderStatus(42)).toBe(false);
  });
});

describe("statusNotification", () => {
  it("uses a short order reference", () => {
    expect(statusNotification("shipped", "0123456789abcdef")?.body).toContain("01234567");
  });

  it.each([
    ["confirmed", "Order confirmed"],
    ["processing", "Order being prepared"],
    ["shipped", "Order shipped"],
    ["delivered", "Order delivered"],
    ["fulfilled", "Order fulfilled"],
    ["cancelled", "Order cancelled"],
  ] as const)("%s -> %s", (status, title) => {
    expect(statusNotification(status, "order-1")?.title).toBe(title);
  });

  it.each(["pending", "paid"] as const)("stays quiet for %s", (status) => {
    expect(statusNotification(status, "order-1")).toBeNull();
  });
});
