import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { getSessionProfile } = await import("@/lib/auth/require-role");

describe("getSessionProfile", () => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
  });

  it("returns empty session when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    await expect(getSessionProfile()).resolves.toEqual({ user: null, role: null });
  });

  it("returns empty session when nobody is signed in", async () => {
    const mock = createSupabaseMock({ user: null });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await expect(getSessionProfile()).resolves.toEqual({ user: null, role: null });
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it("returns the role stored on the profile", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      tables: { profiles: [{ data: { role: "finance_admin" } }] },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const result = await getSessionProfile();

    expect(result).toEqual({ user: { id: "user-1" }, role: "finance_admin" });
    expect(mock.argsFor("profiles", "eq")).toEqual(["id", "user-1"]);
  });

  it("falls back to guest when the profile row is missing", async () => {
    const mock = createSupabaseMock({ user: { id: "user-1" }, tables: { profiles: [{ data: null }] } });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    await expect(getSessionProfile()).resolves.toMatchObject({ role: "guest" });
  });
});
