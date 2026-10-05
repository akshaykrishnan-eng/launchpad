import { NextResponse } from "next/server";

import { refreshTokens } from "@/lib/auth/backend";
import { clearSessionCookies, getRefreshToken, setSessionCookies } from "@/lib/auth/session";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const result = await refreshTokens(refreshToken);
  if (!result.ok) {
    await clearSessionCookies();
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  await setSessionCookies(result.data);
  return NextResponse.json({ ok: true });
}
