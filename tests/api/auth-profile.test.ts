import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, jsonRequest } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

beforeEach(() => {
  vi.resetModules();
  createServerSupabaseClient.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadRoute(superAdminEmail?: string) {
  if (superAdminEmail !== undefined) {
    vi.stubEnv("SUPER_ADMIN_EMAIL", superAdminEmail);
  }
  return import("@/app/api/auth/profile/route");
}

describe("POST /api/auth/profile", () => {
  it("returns 400 when user info is missing", async () => {
    const { POST } = await loadRoute();

    expect((await POST(jsonRequest({ email: "a@b.com" }))).status).toBe(400);
    expect((await POST(jsonRequest({ userId: "user-1" }))).status).toBe(400);
  });

  it("returns 500 for a malformed body", async () => {
    const { POST } = await loadRoute();
    const request = new Request("http://localhost/api/auth/profile", { method: "POST", body: "oops" });

    expect((await POST(request)).status).toBe(500);
  });

  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);
    const { POST } = await loadRoute();

    expect((await POST(jsonRequest({ userId: "user-1", email: "a@b.com" }))).status).toBe(500);
  });

  it("upserts the profile with the requested role and full name", async () => {
    const mock = createSupabaseMock();
    createServerSupabaseClient.mockResolvedValue(mock.client);
    const { POST } = await loadRoute("boss@foodify.test");

    const response = await POST(
      jsonRequest({ userId: "user-1", email: "shopper@test.com", fullName: "Shopper", role: "reseller" }),
    );

    expect(await response.json()).toEqual({ ok: true });
    const [row, options] = mock.argsFor("profiles", "upsert") as [Record<string, unknown>, unknown];
    expect(row).toMatchObject({
      id: "user-1",
      email: "shopper@test.com",
      full_name: "Shopper",
      role: "reseller",
      is_verified: false,
    });
    expect(options).toEqual({ onConflict: "id" });
  });

  it("defaults role to guest and full name to the email", async () => {
    const mock = createSupabaseMock();
    createServerSupabaseClient.mockResolvedValue(mock.client);
    const { POST } = await loadRoute("boss@foodify.test");

    await POST(jsonRequest({ userId: "user-1", email: "shopper@test.com" }));

    expect(mock.argsFor("profiles", "upsert")?.[0]).toMatchObject({ role: "guest", full_name: "shopper@test.com" });
  });

  it("grants super_admin to the configured email regardless of casing or padding", async () => {
    const mock = createSupabaseMock();
    createServerSupabaseClient.mockResolvedValue(mock.client);
    const { POST } = await loadRoute("  Boss@Foodify.test  ");

    await POST(jsonRequest({ userId: "user-1", email: " BOSS@foodify.TEST ", role: "guest" }));

    expect(mock.argsFor("profiles", "upsert")?.[0]).toMatchObject({ role: "super_admin" });
  });

  it("surfaces upsert errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ tables: { profiles: [{ error: { message: "rls denied" } }] } }).client,
    );
    const { POST } = await loadRoute("boss@foodify.test");

    const response = await POST(jsonRequest({ userId: "user-1", email: "shopper@test.com" }));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("rls denied");
  });
});
