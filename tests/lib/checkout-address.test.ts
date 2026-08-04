import { describe, expect, it } from "vitest";
import { formatShippingAddress, shippingAddressSchema } from "@/lib/checkout/address";

const VALID = {
  recipient: "Xeng Cruz",
  phone: "09175551234",
  line1: "12 Mabini Street",
  city: "Quezon City",
  province: "Metro Manila",
  postalCode: "1100",
};

describe("shippingAddressSchema", () => {
  it("defaults the optional fields to empty strings", () => {
    expect(shippingAddressSchema.parse(VALID)).toMatchObject({ line2: "", notes: "" });
  });

  it("trims surrounding whitespace", () => {
    expect(shippingAddressSchema.parse({ ...VALID, recipient: "  Xeng Cruz  " }).recipient).toBe("Xeng Cruz");
  });

  it.each([["09175551234"], ["+63 917 555 1234"], ["02-8123-4567"]])("accepts the phone %s", (phone) => {
    expect(shippingAddressSchema.safeParse({ ...VALID, phone }).success).toBe(true);
  });

  it.each([
    ["a blank recipient", { recipient: "" }],
    ["a letters-only phone", { phone: "call me" }],
    ["a too-short street", { line1: "12" }],
    ["a 3-digit postal code", { postalCode: "110" }],
    ["a non-numeric postal code", { postalCode: "11o0" }],
    ["a missing province", { province: "" }],
  ])("rejects %s", (_label, patch) => {
    expect(shippingAddressSchema.safeParse({ ...VALID, ...patch }).success).toBe(false);
  });

  it("rejects a whitespace-only required field rather than trimming it into validity", () => {
    expect(shippingAddressSchema.safeParse({ ...VALID, city: "   " }).success).toBe(false);
  });
});

describe("formatShippingAddress", () => {
  it("omits the empty optional parts", () => {
    expect(formatShippingAddress(shippingAddressSchema.parse(VALID))).toBe(
      "Xeng Cruz | 09175551234 | 12 Mabini Street | Quezon City, Metro Manila 1100",
    );
  });

  it("includes line2 and notes when supplied", () => {
    const address = shippingAddressSchema.parse({ ...VALID, line2: "Unit 4B", notes: "Leave at guardhouse" });

    expect(formatShippingAddress(address)).toBe(
      "Xeng Cruz | 09175551234 | 12 Mabini Street | Unit 4B | Quezon City, Metro Manila 1100 | Leave at guardhouse",
    );
  });
});
