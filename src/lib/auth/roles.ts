export const PLATFORM_ADMIN_ROLES = ["admin", "super_admin"] as const;
export const FINANCE_ROLES = ["finance_admin", "admin", "super_admin"] as const;
export const RESELLER_ROLES = ["reseller", "admin", "super_admin"] as const;

export function hasRole(role: string | null | undefined, allowedRoles: readonly string[]) {
  return allowedRoles.includes(role ?? "");
}
