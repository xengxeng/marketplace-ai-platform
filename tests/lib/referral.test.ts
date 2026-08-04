import { describe, expect, it } from "vitest";
import {
  REFERRAL_MAX_AGE,
  generateReferralCode,
  normalizeReferralCode,
  referralLink,
} from "@/lib/resellers/referral";

describe("generateReferralCode", () => {
  it("produces 8 characters from the unambiguous alphabet", () => {
    for (let run = 0; run < 200; run += 1) {
      expect(generateReferralCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTVWXYZ23456789]{8}$/);
    }
  });

  it("never emits the look-alike characters O, 0, I, 1 or U", () => {
    const sample = Array.from({ length: 200 }, () => generateReferralCode()).join("");

    expect(sample).not.toMatch(/[O0I1U]/);
  });

  it("is driven by the injected random source", () => {
    expect(generateReferralCode(() => 0)).toBe("AAAAAAAA");
  });

  it("stays in range when the random source returns its upper bound", () => {
    expect(generateReferralCode(() => 0.999999)).toBe("99999999");
  });
});

describe("normalizeReferralCode", () => {
  it.each([
    ["abcd2345", "ABCD2345"],
    ["  abcd2345  ", "ABCD2345"],
    ["ABCD-2345", "ABCD2345"],
    ["ab cd 23 45", "ABCD2345"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeReferralCode(input)).toBe(expected);
  });

  it.each([[""], ["abc"], ["a".repeat(17)], ["abcd_2345"], ["abcd/2345"], [undefined], [null], [42]])(
    "rejects %p",
    (input) => {
      expect(normalizeReferralCode(input)).toBeNull();
    },
  );
});

describe("referralLink", () => {
  it("builds an /r/<code> url and tolerates a trailing slash", () => {
    expect(referralLink("https://foodify.ph", "ABCD2345")).toBe("https://foodify.ph/r/ABCD2345");
    expect(referralLink("https://foodify.ph/", "ABCD2345")).toBe("https://foodify.ph/r/ABCD2345");
  });
});

describe("REFERRAL_MAX_AGE", () => {
  it("is a 30 day attribution window", () => {
    expect(REFERRAL_MAX_AGE).toBe(2_592_000);
  });
});
