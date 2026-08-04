export const REFERRAL_COOKIE = "foodify_ref";

/** Attribution window for a referral click, in seconds (30 days). */
export const REFERRAL_MAX_AGE = 60 * 60 * 24 * 30;

// Crockford-style alphabet: no O/0, I/1 or U, so codes stay readable when a
// reseller reads one out or prints it on packaging.
const ALPHABET = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode(random: () => number = Math.random) {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}

/** Uppercases and strips separators so links tolerate hand-typed variants. */
export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{4,16}$/.test(normalized) ? normalized : null;
}

export function referralLink(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/r/${code}`;
}
