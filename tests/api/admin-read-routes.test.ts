import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();
const getSessionProfile = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/auth/require-role", () => ({ getSessionProfile }));

type Case = {
  name: string;
  table: string;
  payloadKey: string;
  allowedRole: string;
  deniedRole: string;
  load: () => Promise<{ GET: () => Promise<Response> }>;
};

const cases: Case[] = [
  {
    name: "GET /api/merchants",
    table: "merchants",
    payloadKey: "merchants",
    allowedRole: "admin",
    deniedRole: "finance_admin",
    load: () => import("@/app/api/merchants/route"),
  },
  {
    name: "GET /api/orders",
    table: "orders",
    payloadKey: "orders",
    allowedRole: "super_admin",
    deniedRole: "merchant",
    load: () => import("@/app/api/orders/route"),
  },
  {
    name: "GET /api/commissions",
    table: "commissions",
    payloadKey: "commissions",
    allowedRole: "finance_admin",
    deniedRole: "merchant",
    load: () => import("@/app/api/commissions/route"),
  },
  {
    name: "GET /api/wallet-ledger",
    table: "wallet_ledger",
    payloadKey: "entries",
    allowedRole: "finance_admin",
    deniedRole: "reseller",
    load: () => import("@/app/api/wallet-ledger/route"),
  },
];

describe.each(cases)("$name", ({ table, payloadKey, allowedRole, deniedRole, load }) => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
    getSessionProfile.mockReset();
  });

  it("returns 401 when not signed in", async () => {
    getSessionProfile.mockResolvedValue({ user: null, role: null });
    const { GET } = await load();

    const response = await GET();

    expect(response.status).toBe(401);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns 403 for a role without access", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: deniedRole });
    const { GET } = await load();

    expect((await GET()).status).toBe(403);
  });

  it("returns 500 when Supabase is not configured", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: allowedRole });
    createServerSupabaseClient.mockResolvedValue(null);
    const { GET } = await load();

    expect((await GET()).status).toBe(500);
  });

  it(`returns rows from ${table} for an authorized role`, async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: allowedRole });
    const mock = createSupabaseMock({ tables: { [table]: [{ data: [{ id: "row-1" }] }] } });
    createServerSupabaseClient.mockResolvedValue(mock.client);
    const { GET } = await load();

    const body = await (await GET()).json();

    expect(body[payloadKey]).toEqual([{ id: "row-1" }]);
    expect(mock.argsFor(table, "order")).toEqual(["created_at", { ascending: false }]);
  });

  it("defaults to an empty list when Supabase returns no data", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: allowedRole });
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ tables: { [table]: [{ data: null }] } }).client);
    const { GET } = await load();

    expect((await (await GET()).json())[payloadKey]).toEqual([]);
  });

  it("surfaces query errors as 500", async () => {
    getSessionProfile.mockResolvedValue({ user: { id: "user-1" }, role: allowedRole });
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ tables: { [table]: [{ error: { message: "boom" } }] } }).client,
    );
    const { GET } = await load();

    const response = await GET();

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("boom");
  });
});
