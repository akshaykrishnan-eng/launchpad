import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { refreshTokens } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/auth/cookies";

/**
 * Server Components can't write cookies, so a silent refresh can't
 * happen on the protected page itself -- it has to happen here, before
 * the page renders. This only checks cookie *presence*; FastAPI remains
 * the sole verifier of whether the access token is actually valid.
 */
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    return NextResponse.next();
  }

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

  const response = NextResponse.next();
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    result.data.access_token,
    accessTokenCookieOptions(result.data.expires_in),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    result.data.refresh_token,
    refreshTokenCookieOptions(60 * 60 * 24 * 30),
  );
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*"],
};
