export const ACCESS_TOKEN_COOKIE = "launchpad_access_token";
export const REFRESH_TOKEN_COOKIE = "launchpad_refresh_token";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Both cookies are httpOnly: the access and refresh tokens never touch
 * client-side JS, so an XSS bug can't read them out of localStorage/etc.
 * `secure` is relaxed outside production so local http://localhost dev
 * still works (browsers drop Secure cookies on plain http).
 * SameSite=Lax means neither cookie is sent on a cross-site POST, which
 * is what makes CSRF against /api/auth/* unnecessary to defend with a
 * separate token: a forged cross-origin request simply arrives with no
 * session cookie attached.
 */
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function accessTokenCookieOptions(maxAgeSeconds: number) {
  return { ...baseCookieOptions, maxAge: maxAgeSeconds };
}

export function refreshTokenCookieOptions(maxAgeSeconds: number) {
  return { ...baseCookieOptions, maxAge: maxAgeSeconds };
}

export const expiredCookieOptions = { ...baseCookieOptions, maxAge: 0 };
