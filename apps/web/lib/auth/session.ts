import "server-only";

import { cookies } from "next/headers";

import { fetchCurrentUser } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  expiredCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/auth/cookies";
import type { TokenResponse, UserPublic } from "@/lib/auth/types";

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}

/** For Server Components: who is logged in, or null. Never attempts a
 * refresh itself -- Server Components can't write cookies, so silent
 * refresh is handled by middleware before the page ever renders. */
export async function getCurrentUser(): Promise<UserPublic | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const result = await fetchCurrentUser(accessToken);
  return result.ok ? result.data : null;
}

/** For Route Handlers / Server Actions only: writes both session
 * cookies after a successful login/register/refresh. */
export async function setSessionCookies(tokens: TokenResponse): Promise<void> {
  const store = await cookies();
  store.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    accessTokenCookieOptions(tokens.expires_in),
  );
  store.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    // 30 days, matching the backend's refresh_token_expire_days default;
    // the cookie's own lifetime is just a client-side cleanup hint, since
    // the backend is what actually enforces expiry/revocation.
    refreshTokenCookieOptions(60 * 60 * 24 * 30),
  );
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions);
  store.set(REFRESH_TOKEN_COOKIE, "", expiredCookieOptions);
}
