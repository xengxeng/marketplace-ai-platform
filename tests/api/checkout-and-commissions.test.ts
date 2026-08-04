import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const getSessionProfile = vi.fn();
const logActivity = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/auth/require-role", () => ({ getSessionProfile }));
vi.mock("@/lib/activity/log", () => ({ logActivity }));

const { POST: checkout } = await import("@/app/api/checkout/route");
const { POST: approveCommission } = await import("@/app/api/commissions/[id]/approve/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  getSessionProfile.mockReset();
  logActivity.mockReset();
});

const ADDRESS = {
  recipient: "Xeng Cruz",
  phone: "+63 917 555 1234",
  line1: "12 Mabini Street",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1100",
};

/** An active cart holding one sellable line from a verified merchant. */
function sellableCart() {
  return {
    carts: [{ data: { id: "cart-1" } }],
    cart_items: [{ data: [{ quantity: 1, products: { name: "Adobo", status: "active", merchants: { status: "verified" } } }] }],
  };
}

function checkoutRequest(body: unknown = { shippingAddress: ADDRESS }) {
  return jsonRequest(body, "http://localhost/api/checkout");
}

describe("POST /api/checkout", () => {
  it.each([
    ["a missing address", {}],
    ["a short recipient", { shippingAddress: { ...ADDRESS, recipient: "X" } }],
    ["a bad phone number", { shippingAddress: { ...ADDRESS, phone: "not-a-phone" } }],
    ["a non-4-digit postal code", { shippingAddress: { ...ADDRESS, postalCode: "110" } }],
    ["a missing city", { shippingAddress: { ...ADDRESS, city: "" } }],
  ])("rejects %s before touching the database", async (_label, body) => {
    const response = await checkout(checkoutRequest(body));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await checkout(checkoutRequest())).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await checkout(checkoutRequest())).status).toBe(401);
  });

  it("returns 400 when there is no active cart", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { carts: [{ data: null }] } }).client,
    );

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("empty");
  });

  it.each([
    ["the merchant is suspended", { name: "Adobo", status: "active", merchants: { status: "suspended" } }],
    ["the product is archived", { name: "Adobo", status: "archived", merchants: { status: "verified" } }],
    ["the product row is gone", null],
  ])("returns 409 when %s", async (_label, products) => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        carts: [{ data: { id: "cart-1" } }],
        cart_items: [{ data: [{ quantity: 1, products }] }],
      },
      rpc: { place_order: { data: "order-1" } },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(409);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("places the order with the flattened address and logs the activity", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: sellableCart(),
      rpc: { place_order: { data: "order-1" } },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const body = await (await checkout(checkoutRequest())).json();

    expect(body).toEqual({ orderId: "order-1" });
    expect(mock.rpc).toHaveBeenCalledWith("place_order", {
      p_customer_id: "user-1",
      p_reseller_id: null,
      p_shipping_address:
        "Xeng Cruz | +63 917 555 1234 | 12 Mabini Street | Quezon City, Metro Manila 1100",
    });
    expect(logActivity).toHaveBeenCalledWith(mock.client, {
      actorId: "user-1",
      action: "order_placed",
      targetType: "order",
      targetId: "order-1",
    });
  });

  it("returns 400 with the rpc error message when the order cannot be placed", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: sellableCart(),
        rpc: { place_order: { error: { message: "out of stock" } } },
      }).client,
    );

    const response = await checkout(checkoutRequest());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("out of stock");
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("POST /api/commissions/[id]/approve", () => {
  const request = new Request("http://localhost");

  it("returns 401 when not signed in", async () => {
    getSessionProfile.mockResolvedValue({ user: null, role: null });

    expect((await approveCommission(request, routeParams("comm-1"))).status).toBe(401);
  });

  it("returns 403 for roles without finance access", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: "merchant" });

    expect((await approveCommission(request, routeParams("comm-1"))).status).toBe(403);
  });

  it("returns 500 when Supabase is not configured", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await approveCommission(request, routeParams("comm-1"))).status).toBe(500);
  });

  it("approves the commission and notifies the reseller with a peso amount", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "finance_admin" });
    const mock = createSupabaseMock({
      tables: { commissions: [{ data: { reseller_id: "reseller-1", amount_cents: 12345 } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await approveCommission(request, routeParams("comm-1"));

    expect(await response.json()).toEqual({ ok: true });
    expect(mock.rpc).toHaveBeenCalledWith("approve_commission", { p_commission_id: "comm-1" });
    expect(mock.rpc).toHaveBeenCalledWith(
      "notify",
      expect.objectContaining({ p_recipient_id: "reseller-1", p_link: "/dashboard/finance" }),
    );
    const notifyArgs = mock.rpc.mock.calls.find(([name]) => name === "notify")?.[1];
    expect(notifyArgs?.p_body).toContain("₱123.45");
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "commission_approved", targetId: "comm-1" }),
    );
  });

  it("skips the notification when the commission row is missing", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    const mock = createSupabaseMock({ tables: { commissions: [{ data: null }] } });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await approveCommission(request, routeParams("comm-1"));

    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual(["approve_commission"]);
  });

  it("returns 400 when the approve rpc fails", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "admin-1" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        tables: { commissions: [{ data: { reseller_id: "r", amount_cents: 100 } }] },
        rpc: { approve_commission: { error: { message: "already approved" } } },
      }).client,
    );

    const response = await approveCommission(request, routeParams("comm-1"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("already approved");
    expect(logActivity).not.toHaveBeenCalled();
  });
});
