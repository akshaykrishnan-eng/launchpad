import { NextResponse } from "next/server";

import { fetchCurrentUser, loginUser } from "@/lib/auth/backend";
import { postLoginDestination } from "@/lib/auth/roles";
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

  // The destination is derived from the backend's own authenticated-user
  // endpoint, never from a client-supplied role and never duplicated into
  // storage -- it's only ever as trustworthy as /auth/me itself.
  const me = await fetchCurrentUser(result.data.access_token);
  const redirectTo = postLoginDestination(me.ok ? me.data.roles : []);

  // Tokens stay server-side in httpOnly cookies; the client only learns
  // that it's now logged in (and where to go), never the raw tokens.
  return NextResponse.json({ ok: true, redirectTo });
}
