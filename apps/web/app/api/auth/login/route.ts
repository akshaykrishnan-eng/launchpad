import { NextResponse } from "next/server";

import { loginUser } from "@/lib/auth/backend";
import { setSessionCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
  }

  const result = await loginUser(body.email, body.password);
  if (!result.ok) {
    return NextResponse.json({ detail: result.error }, { status: result.status });
  }

  await setSessionCookies(result.data);
  // Tokens stay server-side in httpOnly cookies; the client only learns
  // that it's now logged in, never the raw access/refresh tokens.
  return NextResponse.json({ ok: true });
}
