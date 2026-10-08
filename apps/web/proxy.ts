import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { refreshTokens } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/auth/cookies";
import { isAccessTokenExpired } from "@/lib/auth/jwt";

/**
 * Server Components can't write cookies, so a silent refresh can't
 * happen on the protected page itself -- it has to happen here, before
 * the page renders. Checking the `exp` claim (not just cookie
 * presence) is what decides whether to *attempt* a refresh; it is
 * never treated as authentication -- FastAPI remains the sole verifier
 * of whether the access token is actually valid, same as before.
 */
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let refreshedTokens: { access_token: string; refresh_token: string; expires_in: number } | null = null;

  if (!accessToken || isAccessTokenExpired(accessToken)) {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const result = await refreshTokens(refreshToken);
    if (!result.ok) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      return response;
    }

    refreshedTokens = result.data;
  }

  const response = NextResponse.next();

  if (refreshedTokens) {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      refreshedTokens.access_token,
      accessTokenCookieOptions(refreshedTokens.expires_in),
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      refreshedTokens.refresh_token,
      refreshTokenCookieOptions(60 * 60 * 24 * 30),
    );
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*", "/admin/:path*"],
};
