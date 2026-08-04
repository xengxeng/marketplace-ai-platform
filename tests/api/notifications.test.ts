import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, routeParams } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { GET } = await import("@/app/api/notifications/route");
const { PATCH } = await import("@/app/api/notifications/[id]/read/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
});

describe("GET /api/notifications", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await GET()).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ userError: { message: "expired" } }).client);

    expect((await GET()).status).toBe(401);
  });

  it("returns the 20 most recent notifications", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { notifications: [{ data: [{ id: "n-1" }] }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    expect(await (await GET()).json()).toEqual({ notifications: [{ id: "n-1" }] });
    expect(mock.argsFor("notifications", "limit")).toEqual([20]);
    expect(mock.argsFor("notifications", "order")).toEqual(["created_at", { ascending: false }]);
  });

  it("defaults to an empty list and surfaces errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { notifications: [{ data: null }] } }).client,
    );
    expect(await (await GET()).json()).toEqual({ notifications: [] });

    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { notifications: [{ error: { message: "boom" } }] } }).client,
    );
    const response = await GET();
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("boom");
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  const request = new Request("http://localhost");

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await PATCH(request, routeParams("n-1"))).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await PATCH(request, routeParams("n-1"))).status).toBe(401);
  });

  it("stamps read_at on the requested notification", async () => {
    const mock = createSupabaseMock({ user: { id: "user-1" } });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    expect(await (await PATCH(request, routeParams("n-1"))).json()).toEqual({ ok: true });
    const update = mock.argsFor("notifications", "update")?.[0] as { read_at: string };
    expect(Number.isNaN(Date.parse(update.read_at))).toBe(false);
    expect(mock.argsFor("notifications", "eq")).toEqual(["id", "n-1"]);
  });

  it("surfaces update errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { notifications: [{ error: { message: "nope" } }] } })
        .client,
    );

    expect((await PATCH(request, routeParams("n-1"))).status).toBe(500);
  });
});
