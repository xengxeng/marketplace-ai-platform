import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const logActivity = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/activity/log", () => ({ logActivity }));

const { GET, POST } = await import("@/app/api/products/route");
const { PATCH, DELETE } = await import("@/app/api/products/[id]/route");

const VALID = { name: "Chicken Adobo", priceCents: 12950, stockInt: 20 };

function deleteRequest() {
  return new Request("http://localhost/api/products/p-1", { method: "DELETE" });
}

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  logActivity.mockReset();
});

describe("GET /api/products", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);
    expect((await GET()).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);
    expect((await GET()).status).toBe(401);
  });

  it("returns 403 when the user has no merchant record", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { merchants: [{ data: null }] } }).client,
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("No merchant application");
  });

  it("lists only the caller's own products, newest first", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [{ data: [{ id: "p-1" }] }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await GET();

    expect(await response.json()).toEqual({ products: [{ id: "p-1" }], merchantStatus: "verified" });
    expect(mock.argsFor("products", "eq")).toEqual(["merchant_id", "m-1"]);
    expect(mock.argsFor("products", "order")).toEqual(["created_at", { ascending: false }]);
  });

  it("surfaces query errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          merchants: [{ data: { id: "m-1", status: "verified" } }],
          products: [{ error: { message: "boom" } }],
        },
      }).client,
    );

    const response = await GET();

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("boom");
  });
});

describe("POST /api/products", () => {
  it.each([
    ["a missing name", { priceCents: 100, stockInt: 1 }],
    ["a short name", { ...VALID, name: "x" }],
    ["a negative price", { ...VALID, priceCents: -1 }],
    ["a fractional price", { ...VALID, priceCents: 10.5 }],
    ["fractional stock", { ...VALID, stockInt: 1.5 }],
    ["an unknown status", { ...VALID, status: "live" }],
    ["a non-http image url", { ...VALID, imageUrl: "javascript:alert(1)" }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body", async () => {
    const response = await POST(new Request("http://localhost/api/products", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);
    expect((await POST(jsonRequest(VALID))).status).toBe(401);
  });

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);
    expect((await POST(jsonRequest(VALID))).status).toBe(500);
  });

  it("returns 403 when the user has no merchant record", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { merchants: [{ data: null }] } }).client,
    );

    expect((await POST(jsonRequest(VALID))).status).toBe(403);
  });

  it("blocks publishing an active product while the merchant is unverified", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { merchants: [{ data: { id: "m-1", status: "pending" } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await POST(jsonRequest({ ...VALID, status: "active" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain("verified");
    expect(mock.tableCall("products")).toBeUndefined();
  });

  it("still allows an unverified merchant to save a draft", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "pending" } }],
        products: [{ data: { id: "p-9", status: "draft" } }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    expect((await POST(jsonRequest(VALID))).status).toBe(201);
    expect(mock.argsFor("products", "insert")).toEqual([
      expect.objectContaining({ merchant_id: "m-1", status: "draft" }),
    ]);
  });

  it("creates the product, trims text, nulls blanks and logs the activity", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [{ data: { id: "p-9", status: "active" } }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await POST(
      jsonRequest({
        name: "  Chicken Adobo  ",
        description: "",
        category: "  Mains  ",
        imageUrl: "https://cdn.test/a.png",
        priceCents: 12950,
        stockInt: 20,
        status: "active",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ product: { id: "p-9", status: "active" } });
    expect(mock.argsFor("products", "insert")).toEqual([
      {
        merchant_id: "m-1",
        name: "Chicken Adobo",
        description: null,
        category: "Mains",
        image_url: "https://cdn.test/a.png",
        price_cents: 12950,
        stock_int: 20,
        status: "active",
      },
    ]);
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "product_created", targetId: "p-9" }),
    );
  });

  it("surfaces insert errors as 500 without logging", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          merchants: [{ data: { id: "m-1", status: "verified" } }],
          products: [{ error: { message: "constraint" } }],
        },
      }).client,
    );

    const response = await POST(jsonRequest(VALID));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("constraint");
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/products/[id]", () => {
  it("rejects an empty update", async () => {
    const response = await PATCH(jsonRequest({}), routeParams("p-1"));
    expect(response.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/products/p-1", { method: "PATCH", body: "{" }),
      routeParams("p-1"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when the product does not exist", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: { merchants: [{ data: { id: "m-1", status: "verified" } }], products: [{ data: null }] },
      }).client,
    );

    expect((await PATCH(jsonRequest({ stockInt: 5 }), routeParams("p-1"))).status).toBe(404);
  });

  it("returns 403 for a product owned by another merchant", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [{ data: { id: "p-1", merchant_id: "m-2", status: "active" } }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await PATCH(jsonRequest({ stockInt: 5 }), routeParams("p-1"));

    expect(response.status).toBe(403);
    expect(mock.argsFor("products", "update", 0)).toBeUndefined();
  });

  it("blocks an unverified merchant from flipping a draft to active", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          merchants: [{ data: { id: "m-1", status: "suspended" } }],
          products: [{ data: { id: "p-1", merchant_id: "m-1", status: "draft" } }],
        },
      }).client,
    );

    expect((await PATCH(jsonRequest({ status: "active" }), routeParams("p-1"))).status).toBe(403);
  });

  it("updates only the supplied fields", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [
          { data: { id: "p-1", merchant_id: "m-1", status: "draft" } },
          { data: { id: "p-1", status: "active" } },
        ],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await PATCH(jsonRequest({ stockInt: 0, status: "active" }), routeParams("p-1"));

    expect(response.status).toBe(200);
    expect(mock.argsFor("products", "update", 1)).toEqual([{ stock_int: 0, status: "active" }]);
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "product_updated", targetId: "p-1" }),
    );
  });

  it("surfaces update errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          merchants: [{ data: { id: "m-1", status: "verified" } }],
          products: [
            { data: { id: "p-1", merchant_id: "m-1", status: "draft" } },
            { error: { message: "nope" } },
          ],
        },
      }).client,
    );

    const response = await PATCH(jsonRequest({ stockInt: 1 }), routeParams("p-1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("nope");
  });
});

describe("DELETE /api/products/[id]", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);
    expect((await DELETE(deleteRequest(), routeParams("p-1"))).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);
    expect((await DELETE(deleteRequest(), routeParams("p-1"))).status).toBe(401);
  });

  it("returns 409 when the product is already archived", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [{ data: { id: "p-1", merchant_id: "m-1", status: "archived" } }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await DELETE(deleteRequest(), routeParams("p-1"));

    expect(response.status).toBe(409);
    expect(mock.argsFor("products", "update", 1)).toBeUndefined();
  });

  it("archives instead of hard-deleting, and logs it", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        merchants: [{ data: { id: "m-1", status: "verified" } }],
        products: [{ data: { id: "p-1", merchant_id: "m-1", status: "active" } }, { data: null }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await DELETE(deleteRequest(), routeParams("p-1"));

    expect(await response.json()).toEqual({ ok: true });
    expect(mock.argsFor("products", "update", 1)).toEqual([{ status: "archived" }]);
    expect(mock.argsFor("products", "delete", 1)).toBeUndefined();
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "product_archived", targetId: "p-1" }),
    );
  });

  it("surfaces archive errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          merchants: [{ data: { id: "m-1", status: "verified" } }],
          products: [
            { data: { id: "p-1", merchant_id: "m-1", status: "active" } },
            { error: { message: "locked" } },
          ],
        },
      }).client,
    );

    const response = await DELETE(deleteRequest(), routeParams("p-1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("locked");
  });
});
