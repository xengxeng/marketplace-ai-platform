import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

const createServerSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { POST } = await import("@/app/api/upload/route");

beforeEach(() => {
  createServerSupabaseClient.mockReset();
});

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) {
    form.set("file", file);
  }
  return new Request("http://localhost/api/upload", { method: "POST", body: form });
}

function pngFile(name = "logo.png", bytes = 10, type = "image/png") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("POST /api/upload", () => {
  it("returns 500 when Supabase is not configured", async () => {
    createServerSupabaseClient.mockResolvedValue(null);

    expect((await POST(uploadRequest(pngFile()))).status).toBe(500);
  });

  it("returns 401 when not signed in", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: null }).client);

    expect((await POST(uploadRequest(pngFile()))).status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: { id: "user-1" } }).client);

    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("No file uploaded");
  });

  it("rejects unsupported content types", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: { id: "user-1" } }).client);

    const response = await POST(uploadRequest(pngFile("doc.pdf", 10, "application/pdf")));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("application/pdf");
  });

  it("rejects files larger than 5MB", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: { id: "user-1" } }).client);

    const response = await POST(uploadRequest(pngFile("big.png", 5 * 1024 * 1024 + 1)));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("File exceeds 5MB limit");
  });

  it("stores the file under the user id and returns its public url", async () => {
    const mock = createSupabaseMock({
      user: { id: "user-1" },
      storage: { publicUrl: "https://cdn.test/user-1/logo.png" },
    });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const body = await (await POST(uploadRequest(pngFile("logo.png", 12)))).json();

    expect(body).toMatchObject({ ok: true, url: "https://cdn.test/user-1/logo.png", size: 12 });
    expect(body.path).toMatch(/^user-1\/\d+-[0-9a-f-]+\.png$/);
    const [path, , options] = mock.upload.mock.calls[0];
    expect(path).toBe(body.path);
    expect(options).toEqual({ contentType: "image/png", upsert: false });
  });

  it("falls back to a bin extension for files without one", async () => {
    const mock = createSupabaseMock({ user: { id: "user-1" } });
    createServerSupabaseClient.mockResolvedValue(mock.client);

    const body = await (await POST(uploadRequest(pngFile("logo", 4)))).json();

    expect(body.path).toMatch(/\.logo$/);
  });

  it("surfaces storage upload errors as 500", async () => {
    createServerSupabaseClient.mockResolvedValue(
      createSupabaseMock({ user: { id: "user-1" }, storage: { uploadError: { message: "bucket missing" } } }).client,
    );

    const response = await POST(uploadRequest(pngFile()));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("bucket missing");
  });

  it("returns 500 when the body is not multipart form data", async () => {
    createServerSupabaseClient.mockResolvedValue(createSupabaseMock({ user: { id: "user-1" } }).client);

    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    expect((await POST(request)).status).toBe(500);
  });
});
