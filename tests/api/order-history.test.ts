import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const getSessionProfile = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/auth/require-role", () => ({ getSessionProfile }));

const { GET } = await import("@/app/api/orders/[id]/history/route");

function request() {
  return new Request("http://localhost/api/orders/o-1/history");
}

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  getSessionProfile.mockReset();
});

describe("GET /api/orders/[id]/history", () => {
  it("returns 401 when not signed in", async () => {
    getSessionProfile.mockResolvedValue({ user: null, role: null });

    expect((await GET(request(), routeParams("o-1"))).status).toBe(401);
  });

  it("returns 500 when Supabase is not configured", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "guest" });
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await GET(request(), routeParams("o-1"))).status).toBe(500);
  });

  it("returns the timeline oldest-first, scoped to the order", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    const mock = createSupabaseMock({
      tables: { order_status_history: [{ data: [{ id: "h-1", to_status: "paid" }] }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await GET(request(), routeParams("o-1"));

    expect(await response.json()).toEqual({ history: [{ id: "h-1", to_status: "paid" }] });
    expect(mock.argsFor("order_status_history", "eq")).toEqual(["order_id", "o-1"]);
    expect(mock.argsFor("order_status_history", "order")).toEqual(["created_at", { ascending: true }]);
  });

  it("returns an empty timeline rather than null", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "guest" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ tables: { order_status_history: [{ data: null }] } }).client,
    );

    expect(await (await GET(request(), routeParams("o-1"))).json()).toEqual({ history: [] });
  });

  it("surfaces query errors as 500", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "u" }, role: "admin" });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ tables: { order_status_history: [{ error: { message: "denied" } }] } }).client,
    );

    const response = await GET(request(), routeParams("o-1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("denied");
  });
});
