export const DEFAULT_ROLE = "guest";

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined) {
  const superAdminEmail = getSuperAdminEmail();
  if (!superAdminEmail) {
    return false;
  }

  return (email ?? "").trim().toLowerCase() === superAdminEmail;
}
