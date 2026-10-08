import type { UserPublic } from "@/lib/auth/types";

// ADMIN and SUPER_ADMIN are treated identically on the frontend, same
// as the backend's require_admin dependency (see apps/api/app/api/deps.py)
// -- this is UX routing only, never the security boundary.
export const ADMIN_ROLES: readonly string[] = ["ADMIN", "SUPER_ADMIN"];

export function isAdminUser(user: Pick<UserPublic, "roles"> | null | undefined): boolean {
  if (!user) return false;
  return user.roles.some((role) => ADMIN_ROLES.includes(role));
}

export function isCandidateUser(user: Pick<UserPublic, "roles"> | null | undefined): boolean {
  if (!user) return false;
  return user.roles.includes("CANDIDATE");
}

/** Where a freshly authenticated user should land, based solely on
 * roles the backend returned for their own session -- never a
 * client-supplied or stored role. */
export function postLoginDestination(roles: string[]): string {
  return isAdminUser({ roles }) ? "/admin" : "/app";
}
