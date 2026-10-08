import { NextResponse } from "next/server";

import { fetchCurrentUser, loginUser } from "@/lib/auth/backend";
import { isCandidateUser, postLoginDestination } from "@/lib/auth/roles";
import { setSessionCookies } from "@/lib/auth/session";
import { getServerDashboard } from "@/lib/candidate/backend";

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
  const roles = me.ok ? me.data.roles : [];
  let redirectTo = postLoginDestination(roles);

  // Candidates who haven't finished the guided onboarding profile steps
  // land there first instead of the dashboard. "Finished" is derived
  // from the same backend dashboard/next-action data the onboarding and
  // dashboard pages already use (profile_completion/next_action) --
  // no separate "first login" flag, so there's nothing to get out of
  // sync and no redirect loop (a dashboard fetch failure just falls
  // back to the existing /app destination). Admins and other roles are
  // unaffected -- this only ever narrows the plain-candidate /app case.
  if (redirectTo === "/app" && isCandidateUser({ roles })) {
    const dashboard = await getServerDashboard(result.data.access_token);
    if (dashboard && dashboard.next_action.type !== "PROFILE_COMPLETE") {
      redirectTo = "/onboarding";
    }
  }

  // Tokens stay server-side in httpOnly cookies; the client only learns
  // that it's now logged in (and where to go), never the raw tokens.
  return NextResponse.json({ ok: true, redirectTo });
}
