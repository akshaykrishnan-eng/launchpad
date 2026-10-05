import "server-only";

import { NextResponse } from "next/server";

import { refreshTokens } from "@/lib/auth/backend";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/session";
import { config } from "@/lib/config";

/**
 * Generic server-side proxy for every `/api/v1/candidate/*` endpoint.
 * One implementation instead of ~15 near-identical Route Handlers,
 * matching the "Next.js BFF -> FastAPI /api/v1" architecture: the
 * browser only ever talks to this app's own /api/candidate/* path,
 * never the Docker-internal API hostname, and never holds a token.
 */
export async function proxyCandidateRequest(
  request: Request,
  pathSegments: string[],
): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const search = new URL(request.url).search;
  const targetPath = `/api/v1/candidate/${pathSegments.join("/")}${search}`;
  const body = request.method === "GET" || request.method === "DELETE"
    ? undefined
    : await request.text();

  const forward = (token: string) =>
    fetch(`${config.internalApiUrl}${targetPath}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });

  let response = await forward(accessToken);

  if (response.status === 401) {
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
    response = await forward(refreshed.data.access_token);
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
