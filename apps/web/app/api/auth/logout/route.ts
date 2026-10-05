import { NextResponse } from "next/server";

import { logoutUser } from "@/lib/auth/backend";
import { clearSessionCookies, getRefreshToken } from "@/lib/auth/session";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await logoutUser(refreshToken);
  }
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
