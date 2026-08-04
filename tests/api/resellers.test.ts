import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const logActivity = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/activity/log", () => ({ logActivity }));

const { POST: apply } = await import("@/app/api/resellers/apply/route");
const { GET: me } = await import("@/app/api/resellers/me/route");
const { GET: referral } = await import("@/app/r/[code]/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
  logActivity.mockReset();
});

function applyRequest(body: unknown = { displayName: "Xeng Resells" }) {
  return jsonRequest(body, "http://localhost/api/resellers/apply");
}

describe("POST /api/resellers/apply", () => {
  it("rejects a non-JSON body", async () => {
    const request = new Request("http://localhost", { method: "POST", body: "{" });

    expect((await apply(request)).status).toBe(400);
  });

  it.each([[""], ["X"], [42], [null]])("rejects the display name %p", async (displayName) => {
    const response = await apply(applyRequest({ displayName }));

    expect(response.status).toBe(400);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await apply(applyRequest())).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await apply(applyRequest())).status).toBe(401);
  });

  it("returns 409 when already registered", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { resellers: [{ data: { id: "r-1" } }] } }).client,
    );

    expect((await apply(applyRequest())).status).toBe(409);
  });

  it("creates the reseller, promotes the profile role and logs the activity", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        resellers: [{ data: null }, { data: { id: "r-1", referral_code: "ABCD2345" } }],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const body = await (await apply(applyRequest())).json();

    expect(body).toEqual({ ok: true, resellerId: "r-1", referralCode: "ABCD2345" });
    expect(mock.argsFor("resellers", "insert", 1)?.[0]).toMatchObject({
      profile_id: "user-1",
      display_name: "Xeng Resells",
      status: "active",
    });
    expect(mock.argsFor("profiles", "update")).toEqual([{ role: "reseller" }]);
    expect(logActivity).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({ action: "reseller_registered", targetId: "r-1" }),
    );
  });

  it("generates a code from the unambiguous alphabet", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { resellers: [{ data: null }, { data: { id: "r-1", referral_code: "ABCD2345" } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await apply(applyRequest());

    const inserted = mock.argsFor("resellers", "insert", 1)?.[0] as { referral_code: string };

    expect(inserted.referral_code).toMatch(/^[ABCDEFGHJKLMNPQRSTVWXYZ23456789]{8}$/);
  });

  it("retries on a referral code collision", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: {
        resellers: [
          { data: null },
          { error: { message: 'duplicate key value violates unique constraint "resellers_referral_code_key"' } },
          { data: { id: "r-1", referral_code: "ABCD2345" } },
        ],
      },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await apply(applyRequest());

    expect(response.status).toBe(200);
    expect(mock.argsFor("resellers", "insert", 1)).toBeDefined();
    expect(mock.argsFor("resellers", "insert", 2)).toBeDefined();
  });

  it("gives up with 503 when every code collides", async () => {
    const collision = {
      error: { message: 'duplicate key value violates unique constraint "resellers_referral_code_key"' },
    };
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: { resellers: [{ data: null }, collision, collision, collision, collision, collision] },
      }).client,
    );

    expect((await apply(applyRequest())).status).toBe(503);
  });

  it("surfaces a non-collision insert error as 500 without retrying", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { resellers: [{ data: null }, { error: { message: "db down" } }, { data: { id: "r-2" } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const response = await apply(applyRequest());

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("db down");
    expect(mock.argsFor("resellers", "insert", 2)).toBeUndefined();
  });
});

describe("GET /api/resellers/me", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await me()).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await me()).status).toBe(401);
  });

  it("returns a null profile for someone who has not registered", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, tables: { resellers: [{ data: null }] } }).client,
    );

    expect(await (await me()).json()).toEqual({ reseller: null, commissions: [], totals: null });
  });

  it("totals commissions by status and derives the wallet balance from the ledger", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          resellers: [{ data: { id: "r-1", display_name: "Xeng", referral_code: "ABCD2345", status: "active" } }],
          commissions: [
            {
              data: [
                { id: "c-1", order_id: "o-1", amount_cents: 500, status: "pending", created_at: "2026-01-01" },
                { id: "c-2", order_id: "o-2", amount_cents: 250, status: "pending", created_at: "2026-01-02" },
                { id: "c-3", order_id: "o-3", amount_cents: 1000, status: "approved", created_at: "2026-01-03" },
                { id: "c-4", order_id: "o-4", amount_cents: 400, status: "paid", created_at: "2026-01-04" },
              ],
            },
          ],
          wallet_ledger: [
            {
              data: [
                { entry_type: "credit", amount_cents: 1000 },
                { entry_type: "credit", amount_cents: 400 },
                { entry_type: "debit", amount_cents: 300 },
              ],
            },
          ],
        },
      }).client,
    );

    const body = await (await me()).json();

    expect(body.totals).toEqual({
      pendingCents: 750,
      approvedCents: 1000,
      paidCents: 400,
      walletCents: 1100,
      orderCount: 4,
    });
  });

  it("surfaces commission query errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          resellers: [{ data: { id: "r-1", referral_code: "ABCD2345", status: "active" } }],
          commissions: [{ error: { message: "commissions down" } }],
        },
      }).client,
    );

    const response = await me();

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("commissions down");
  });
});

describe("GET /r/[code]", () => {
  function visit(code: string) {
    return referral(new Request(`http://localhost/r/${code}`), { params: Promise.resolve({ code }) });
  }

  it("stores the normalized code and redirects to the storefront", async () => {
    const response = await visit("abcd-2345");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/products");

    const cookie = response.cookies.get("foodify_ref");

    expect(cookie?.value).toBe("ABCD2345");
    expect(cookie?.maxAge).toBe(2_592_000);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("sets no cookie and sends a malformed code home", async () => {
    const response = await visit("nope!");

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(response.cookies.get("foodify_ref")).toBeUndefined();
  });
});
