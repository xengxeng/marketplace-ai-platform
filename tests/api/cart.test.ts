import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { GET } = await import("@/app/api/cart/route");
const { POST } = await import("@/app/api/cart/items/route");
const { DELETE } = await import("@/app/api/cart/items/[id]/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
});

describe("GET /api/cart", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await GET()).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await GET()).status).toBe(401);
  });

  it("returns an empty cart when the shopper has no active cart", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { carts: [{ data: null }] } }).client,
    );

    expect(await (await GET()).json()).toEqual({ cartId: null, items: [], totalCents: 0 });
  });

  it("normalizes joined products and totals the line subtotals", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        carts: [{ data: { id: "cart-1" } }],
        cart_items: [
          {
            data: [
              {
                id: "item-1",
                quantity: 2,
                product_id: "prod-1",
                products: { name: "Lechon", price_cents: 1500, stock_int: 9 },
              },
              {
                id: "item-2",
                quantity: 3,
                product_id: "prod-2",
                products: [{ name: "Adobo", price_cents: 1000, stock_int: 4 }],
              },
            ],
          },
        ],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const body = await (await GET()).json();

    expect(body.cartId).toBe("cart-1");
    expect(body.totalCents).toBe(6000);
    expect(body.items).toEqual([
      {
        id: "item-1",
        productId: "prod-1",
        name: "Lechon",
        priceCents: 1500,
        stock: 9,
        quantity: 2,
        subtotalCents: 3000,
      },
      {
        id: "item-2",
        productId: "prod-2",
        name: "Adobo",
        priceCents: 1000,
        stock: 4,
        quantity: 3,
        subtotalCents: 3000,
      },
    ]);
  });

  it("falls back to placeholder values when the product join is missing", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          carts: [{ data: { id: "cart-1" } }],
          cart_items: [{ data: [{ id: "item-1", quantity: 2, product_id: "prod-1", products: null }] }],
        },
      }).client,
    );

    const body = await (await GET()).json();

    expect(body.items[0]).toMatchObject({ name: "Unknown product", priceCents: 0, stock: 0, subtotalCents: 0 });
    expect(body.totalCents).toBe(0);
  });

  it("surfaces cart item query errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: { carts: [{ data: { id: "cart-1" } }], cart_items: [{ error: { message: "items down" } }] },
      }).client,
    );

    const response = await GET();

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("items down");
  });
});

describe("POST /api/cart/items", () => {
  it("returns 400 when productId is missing", async () => {
    const response = await POST(jsonRequest({ quantity: 2 }));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 500 for a malformed JSON body", async () => {
    const request = new Request("http://localhost/api/cart/items", { method: "POST", body: "not json" });

    expect((await POST(request)).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await POST(jsonRequest({ productId: "prod-1" }))).status).toBe(401);
  });

  it("creates a cart then inserts the item, defaulting invalid quantities to 1", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        carts: [{ data: null }, { data: { id: "cart-new" } }],
        cart_items: [{ data: null }, { data: null }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await POST(jsonRequest({ productId: "prod-1", quantity: -3 }));

    expect(await response.json()).toEqual({ ok: true });
    expect(mock.argsFor("carts", "insert", 1)).toEqual([{ customer_id: "user-1" }]);
    expect(mock.argsFor("cart_items", "insert", 1)).toEqual([
      { cart_id: "cart-new", product_id: "prod-1", quantity: 1 },
    ]);
  });

  it("increments the quantity of an existing line and floors fractional input", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        carts: [{ data: { id: "cart-1" } }],
        cart_items: [{ data: { id: "item-1", quantity: 2 } }, { data: null }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await POST(jsonRequest({ productId: "prod-1", quantity: 2.7 }));

    const update = mock.argsFor("cart_items", "update", 1)?.[0] as { quantity: number };
    expect(update.quantity).toBe(4);
  });

  it("surfaces cart lookup, creation, update and insert failures", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { carts: [{ error: { message: "lookup" } }] } }).client,
    );
    expect((await (await POST(jsonRequest({ productId: "p" }))).json()).error).toBe("lookup");

    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: { carts: [{ data: null }, { error: { message: "create" } }] },
      }).client,
    );
    expect((await (await POST(jsonRequest({ productId: "p" }))).json()).error).toBe("create");

    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          carts: [{ data: { id: "cart-1" } }],
          cart_items: [{ data: { id: "item-1", quantity: 1 } }, { error: { message: "update" } }],
        },
      }).client,
    );
    expect((await (await POST(jsonRequest({ productId: "p" }))).json()).error).toBe("update");

    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          carts: [{ data: { id: "cart-1" } }],
          cart_items: [{ data: null }, { error: { message: "insert" } }],
        },
      }).client,
    );
    expect((await (await POST(jsonRequest({ productId: "p" }))).json()).error).toBe("insert");
  });
});

describe("DELETE /api/cart/items/[id]", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await DELETE(new Request("http://localhost"), routeParams("item-1"))).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ userError: { message: "no session" } }).client);

    expect((await DELETE(new Request("http://localhost"), routeParams("item-1"))).status).toBe(401);
  });

  it("deletes the requested line item", async () => {
    const mock = createSupabaseMock({ user: { id: "user-1" } });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await DELETE(new Request("http://localhost"), routeParams("item-1"));

    expect(await response.json()).toEqual({ ok: true });
    expect(mock.argsFor("cart_items", "eq")).toEqual(["id", "item-1"]);
  });

  it("surfaces delete errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { cart_items: [{ error: { message: "nope" } }] } }).client,
    );

    const response = await DELETE(new Request("http://localhost"), routeParams("item-1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("nope");
  });
});
