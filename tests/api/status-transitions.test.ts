import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const getSessionProfile = vi.fn();
const logActivity = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/auth/require-role", () => ({ getSessionProfile }));
vi.mock("@/lib/activity/log", () => ({ logActivity }));

const { PATCH: patchMerchant } = await import("@/app/api/merchants/[id]/status/route");
const { PATCH: patchOrder } = await import("@/app/api/orders/[id]/status/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  getSessionProfile.mockReset();
  logActivity.mockReset();
});

function notifyArgs(mock: ReturnType<typeof createSupabaseMock>) {
  return mock.rpc.mock.calls.find(([name]) => name === "notify")?.[1] as
    | Record<"p_recipient_id" | "p_title" | "p_body" | "p_link", string>
    | undefined;
}

describe("PATCH /api/merchants/[id]/status", () => {
  it("returns 401 when not signed in", async () => {
    getSessionProfile.mockResolvedValue({ user: null, role: null });

    expect((await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"))).status).toBe(401);
  });

  it("returns 403 for non-admin roles", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "finance_admin" });

    expect((await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"))).status).toBe(403);
  });

  it("rejects statuses outside the allowed set", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });

    const response = await patchMerchant(jsonRequest({ status: "deleted" }), routeParams("m-1"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid status");
  });

  it("returns 500 when Supabase is not configured", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"))).status).toBe(500);
  });

  it("returns 404 when the merchant does not exist", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ tables: { merchants: [{ data: null }] } }).client);

    expect((await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"))).status).toBe(404);
  });

  it("verifies a merchant, logs the transition and notifies the owner", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "super_admin" });
    const mock = createSupabaseMock({
      tables: {
        merchants: [
          { data: { status: "pending", owner_id: "owner-1", business_name: "Xeng Foods" } },
          { data: null },
        ],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"));

    expect(await response.json()).toEqual({ ok: true });
    expect(mock.argsFor("merchants", "update", 1)).toEqual([{ status: "verified" }]);
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "merchant_status_changed", metadata: { from: "pending", to: "verified" } }),
    );
    expect(notifyArgs(mock)).toMatchObject({
      p_recipient_id: "owner-1",
      p_title: "Merchant application approved",
      p_link: "/dashboard/merchant",
    });
    expect(notifyArgs(mock)?.p_body).toContain("Xeng Foods");
  });

  it("notifies with suspension copy when suspending", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: {
        merchants: [{ data: { status: "verified", owner_id: "owner-1", business_name: "Xeng Foods" } }, { data: null }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await patchMerchant(jsonRequest({ status: "suspended" }), routeParams("m-1"));

    expect(notifyArgs(mock)?.p_title).toBe("Merchant account suspended");
  });

  it("does not notify when moving back to pending", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: {
        merchants: [{ data: { status: "verified", owner_id: "owner-1", business_name: "Xeng Foods" } }, { data: null }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await patchMerchant(jsonRequest({ status: "pending" }), routeParams("m-1"));

    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("surfaces update errors as 500", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          merchants: [
            { data: { status: "pending", owner_id: "owner-1", business_name: "Xeng Foods" } },
            { error: { message: "write failed" } },
          ],
        },
      }).client,
    );

    const response = await patchMerchant(jsonRequest({ status: "verified" }), routeParams("m-1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("write failed");
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/orders/[id]/status", () => {
  const orderId = "0123456789abcdef";

  it("returns 401 when not signed in", async () => {
    getSessionProfile.mockResolvedValue({ user: null, role: null });

    expect((await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId))).status).toBe(401);
  });

  it("returns 403 for non-admin roles", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "merchant" });

    expect((await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId))).status).toBe(403);
  });

  it("rejects unknown statuses", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });

    expect((await patchOrder(jsonRequest({ status: "refunded" }), routeParams(orderId))).status).toBe(400);
  });

  it("returns 500 when Supabase is not configured", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId))).status).toBe(500);
  });

  it("returns 404 when the order does not exist", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ tables: { orders: [{ data: null }] } }).client);

    expect((await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId))).status).toBe(404);
  });

  it("returns 409 when the order is already in a terminal status", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ tables: { orders: [{ data: { status: "fulfilled", customer_id: "c-1" } }] } }).client,
    );

    const response = await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("already fulfilled");
  });

  it("updates a pending order to paid without notifying", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { orders: [{ data: { status: "pending", customer_id: "c-1" } }, { data: null }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    expect(await (await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId))).json()).toEqual({
      ok: true,
      status: "paid",
    });
    expect(mock.argsFor("order_status_history", "insert")).toEqual([
      { order_id: orderId, from_status: "pending", to_status: "paid", changed_by: "admin-1" },
    ]);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ metadata: { from: "pending", to: "paid" } }),
    );
  });

  it("notifies the customer with a short order reference on delivery", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { orders: [{ data: { status: "shipped", customer_id: "c-1" } }, { data: null }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await patchOrder(jsonRequest({ status: "delivered" }), routeParams(orderId));

    expect(notifyArgs(mock)).toMatchObject({
      p_recipient_id: "c-1",
      p_title: "Order delivered",
      p_link: `/orders/${orderId}`,
    });
    expect(notifyArgs(mock)?.p_body).toContain("01234567");
  });

  it.each([
    ["pending", "confirmed", "Order confirmed"],
    ["confirmed", "processing", "Order being prepared"],
    ["processing", "shipped", "Order shipped"],
  ])("walks %s -> %s and notifies with %s", async (from, to, title) => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { orders: [{ data: { status: from, customer_id: "c-1" } }, { data: null }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await patchOrder(jsonRequest({ status: to }), routeParams(orderId));

    expect(response.status).toBe(200);
    expect(notifyArgs(mock)?.p_title).toBe(title);
  });

  it.each([
    ["pending", "shipped"],
    ["paid", "delivered"],
    ["shipped", "cancelled"],
    ["processing", "paid"],
  ])("returns 409 for the illegal %s -> %s jump", async (from, to) => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { orders: [{ data: { status: from, customer_id: "c-1" } }, { data: null }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await patchOrder(jsonRequest({ status: to }), routeParams(orderId));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain(`from ${from} to ${to}`);
    expect(mock.argsFor("orders", "update", 1)).toBeUndefined();
    expect(mock.tableCall("order_status_history")).toBeUndefined();
  });

  it("rejects a non-JSON body", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });

    const response = await patchOrder(
      new Request("http://localhost/api/orders/x/status", { method: "PATCH", body: "{" }),
      routeParams(orderId),
    );

    expect(response.status).toBe(400);
  });

  it("notifies with cancellation copy when cancelling", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { orders: [{ data: { status: "pending", customer_id: "c-1" } }, { data: null }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await patchOrder(jsonRequest({ status: "cancelled" }), routeParams(orderId));

    expect(notifyArgs(mock)?.p_title).toBe("Order cancelled");
  });

  it("surfaces update errors as 500", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        tables: { orders: [{ data: { status: "pending", customer_id: "c-1" } }, { error: { message: "db down" } }] },
      }).client,
    );

    const response = await patchOrder(jsonRequest({ status: "paid" }), routeParams(orderId));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("db down");
  });
});
