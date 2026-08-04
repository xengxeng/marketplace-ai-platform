import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const logActivity = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/activity/log", () => ({ logActivity }));

const { POST } = await import("@/app/api/merchants/apply/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  logActivity.mockReset();
});

describe("POST /api/merchants/apply", () => {
  it.each([
    ["missing", {}],
    ["empty", { businessName: "" }],
    ["too short", { businessName: " x " }],
    ["not a string", { businessName: 42 }],
  ])("rejects a %s business name", async (_label, body) => {
    const response = await POST(jsonRequest(body));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await POST(jsonRequest({ businessName: "Xeng Foods" }))).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await POST(jsonRequest({ businessName: "Xeng Foods" }))).status).toBe(401);
  });

  it("returns 409 when the user already applied", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { merchants: [{ data: { id: "m-1" } }] } }).client,
    );

    const response = await POST(jsonRequest({ businessName: "Xeng Foods" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("already have a merchant application");
  });

  it("creates the application, promotes the profile to merchant and logs it", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { merchants: [{ data: null }, { data: { id: "m-9" } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await POST(jsonRequest({ businessName: "  Xeng Foods  " }));

    expect(await response.json()).toEqual({ ok: true, merchantId: "m-9" });
    expect(mock.argsFor("merchants", "insert", 1)).toEqual([
      { owner_id: "user-1", business_name: "Xeng Foods", status: "pending" },
    ]);
    expect(mock.argsFor("profiles", "update")).toEqual([{ role: "merchant" }]);
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "merchant_applied", targetId: "m-9" }),
    );
  });

  it("surfaces insert errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: { merchants: [{ data: null }, { error: { message: "duplicate name" } }] },
      }).client,
    );

    const response = await POST(jsonRequest({ businessName: "Xeng Foods" }));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("duplicate name");
    expect(logActivity).not.toHaveBeenCalled();
  });
});
