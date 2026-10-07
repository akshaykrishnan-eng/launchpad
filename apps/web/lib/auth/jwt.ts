/**
 * Reads the `exp` claim out of a JWT's payload without verifying its
 * signature. This exists purely so proxy.ts can decide whether it's
 * *worth attempting* a refresh before a protected page renders -- it
 * is never treated as proof of authentication. The backend (via
 * /api/v1/auth/me and get_current_user on every other endpoint)
 * remains the only party that actually authenticates the token.
 */
export function isAccessTokenExpired(token: string, nowMs: number = Date.now()): boolean {
  const exp = readExpClaim(token);
  if (exp === null) return true;
  return nowMs >= exp * 1000;
}

function readExpClaim(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}
