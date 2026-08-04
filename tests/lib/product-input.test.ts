import { describe, expect, it } from "vitest";
import { createProductSchema, firstIssue, toProductRow, updateProductSchema } from "@/lib/products/input";
import { canPublish } from "@/lib/products/merchant";

describe("createProductSchema", () => {
  it("defaults optional fields and trims text", () => {
    const parsed = createProductSchema.parse({ name: " Sisig ", priceCents: 100, stockInt: 3 });

    expect(parsed).toEqual({
      name: "Sisig",
      description: null,
      category: null,
      imageUrl: null,
      priceCents: 100,
      stockInt: 3,
      status: "draft",
    });
  });

  it("turns blank optional strings into null", () => {
    const parsed = createProductSchema.parse({
      name: "Sisig",
      description: "   ",
      category: "",
      imageUrl: "",
      priceCents: 0,
      stockInt: 0,
    });

    expect([parsed.description, parsed.category, parsed.imageUrl]).toEqual([null, null, null]);
  });

  it.each([
    ["a non-http image url", { imageUrl: "ftp://cdn/a.png" }],
    ["an absurd price", { priceCents: 100_000_001 }],
    ["stock above the cap", { stockInt: 1_000_001 }],
  ])("rejects %s", (_label, patch) => {
    const result = createProductSchema.safeParse({ name: "Sisig", priceCents: 1, stockInt: 1, ...patch });
    expect(result.success).toBe(false);
  });
});

describe("updateProductSchema", () => {
  it("accepts a single field", () => {
    expect(updateProductSchema.parse({ stockInt: 4 })).toEqual({ stockInt: 4 });
  });

  it("rejects an empty patch", () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
});

describe("toProductRow", () => {
  it("omits absent keys so a patch never clears untouched columns", () => {
    expect(toProductRow({ stockInt: 0 })).toEqual({ stock_int: 0 });
  });

  it("maps every field to its column, including explicit nulls", () => {
    expect(
      toProductRow({
        name: "A",
        description: null,
        category: null,
        imageUrl: null,
        priceCents: 1,
        stockInt: 2,
        status: "archived",
      }),
    ).toEqual({
      name: "A",
      description: null,
      category: null,
      image_url: null,
      price_cents: 1,
      stock_int: 2,
      status: "archived",
    });
  });
});

describe("firstIssue", () => {
  it("prefixes the field path", () => {
    const result = createProductSchema.safeParse({ name: "x", priceCents: 1, stockInt: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssue(result.error)).toMatch(/^name: /);
    }
  });

  it("falls back to the bare message for root-level issues", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssue(result.error)).toBe("No fields to update");
    }
  });
});

describe("canPublish", () => {
  it.each([
    ["verified", true],
    ["pending", false],
    ["suspended", false],
  ])("%s merchant -> %s", (status, expected) => {
    expect(canPublish({ id: "m-1", status })).toBe(expected);
  });
});
