import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("reports pending when Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const { GET } = await import("@/app/api/health/route");
    const body = await (await GET()).json();

    expect(body.status).toBe("pending");
    expect(body.configured).toBe(false);
    expect(body.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("reports configured when both env vars are present", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const { GET } = await import("@/app/api/health/route");
    const body = await (await GET()).json();

    expect(body).toMatchObject({ status: "configured", configured: true });
  });
});
