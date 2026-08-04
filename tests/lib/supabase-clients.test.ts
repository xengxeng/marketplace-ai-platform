import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn(() => ({ kind: "browser" }));
type CookieToSet = { name: string; value: string; options: Record<string, unknown> };
type ServerClientOptions = {
  cookies: { getAll: () => unknown; setAll: (cookies: CookieToSet[]) => void };
};

const createServerClient = vi.fn((_url: string, _key: string, _options: ServerClientOptions) => ({
  kind: "server",
}));
const cookies = vi.fn();

vi.mock("@supabase/ssr", () => ({ createBrowserClient, createServerClient }));
vi.mock("next/headers", () => ({ cookies }));

beforeEach(() => {
  vi.resetModules();
  createBrowserClient.mockClear();
  createServerClient.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubEnv(url: string, key: string) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key);
}

describe("createBrowserSupabaseClient", () => {
  it("returns null when env vars are missing", async () => {
    stubEnv("", "");
    const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");

    expect(createBrowserSupabaseClient()).toBeNull();
    expect(createBrowserClient).not.toHaveBeenCalled();
  });

  it("creates a browser client from the configured env vars", async () => {
    stubEnv("https://project.supabase.co", "anon-key");
    const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");

    expect(createBrowserSupabaseClient()).toEqual({ kind: "browser" });
    expect(createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "anon-key");
  });
});

describe("createServerSupabaseClient", () => {
  it("returns null when env vars are missing", async () => {
    stubEnv("", "");
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");

    expect(await createServerSupabaseClient()).toBeNull();
    expect(cookies).not.toHaveBeenCalled();
  });

  it("wires the request cookie store into the server client", async () => {
    stubEnv("https://project.supabase.co", "anon-key");
    const store = {
      getAll: vi.fn(() => [{ name: "sb", value: "token" }]),
      set: vi.fn(),
    };
    cookies.mockResolvedValue(store);

    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    expect(await createServerSupabaseClient()).toEqual({ kind: "server" });

    const options = createServerClient.mock.calls[0][2];

    expect(options.cookies.getAll()).toEqual([{ name: "sb", value: "token" }]);

    options.cookies.setAll([{ name: "sb", value: "next", options: { path: "/" } }]);
    expect(store.set).toHaveBeenCalledWith("sb", "next", { path: "/" });
  });

  it("ignores cookie writes rejected during server component render", async () => {
    stubEnv("https://project.supabase.co", "anon-key");
    cookies.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error("Cookies can only be modified in a Server Action or Route Handler");
      }),
    });

    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    await createServerSupabaseClient();

    const options = createServerClient.mock.calls[0][2];

    expect(() => options.cookies.setAll([{ name: "sb", value: "next", options: {} }])).not.toThrow();
  });

  it("getServerSupabaseClient delegates to createServerSupabaseClient", async () => {
    stubEnv("https://project.supabase.co", "anon-key");
    cookies.mockResolvedValue({ getAll: vi.fn(() => []), set: vi.fn() });

    const { getServerSupabaseClient } = await import("@/lib/supabase/server");

    expect(await getServerSupabaseClient()).toEqual({ kind: "server" });
  });
});
