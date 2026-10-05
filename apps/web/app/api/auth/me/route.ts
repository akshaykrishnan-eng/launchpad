import { NextResponse } from "next/server";

import { fetchCurrentUser, refreshTokens } from "@/lib/auth/backend";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/session";

export async function GET() {
  const accessToken = await getAccessToken();

  if (accessToken) {
    const result = await fetchCurrentUser(accessToken);
    if (result.ok) {
      return NextResponse.json(result.data);
    }
  }

  // Access token missing or expired: try a silent refresh once before
  // giving up. This is the one place a 401 gets a retry -- everywhere
  // else, an expired access token should just surface as "logged out".
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const refreshed = await refreshTokens(refreshToken);
  if (!refreshed.ok) {
    await clearSessionCookies();
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  await setSessionCookies(refreshed.data);
  const retried = await fetchCurrentUser(refreshed.data.access_token);
  if (!retried.ok) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json(retried.data);
}
