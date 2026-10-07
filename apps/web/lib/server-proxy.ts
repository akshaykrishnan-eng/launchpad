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
 * Generic server-side proxy for a FastAPI path, shared by every
 * `/api/<area>/*` Next.js Route Handler (candidate, admin, ...) --
 * one implementation of the auth/refresh/body-forwarding logic instead
 * of duplicating it per area. See lib/candidate/proxy.ts for the
 * original, area-specific version this was extracted from.
 *
 * Bodies are forwarded as raw bytes with the original Content-Type in
 * both directions (not re-encoded as text/JSON), so this also
 * correctly proxies multipart uploads and binary downloads, not just
 * JSON calls.
 */
export async function proxyApiRequest(request: Request, targetPath: string): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const hasBody = request.method !== "GET" && request.method !== "DELETE";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const requestContentType = request.headers.get("content-type");

  const forward = (token: string) =>
    fetch(`${config.internalApiUrl}${targetPath}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(requestContentType ? { "Content-Type": requestContentType } : {}),
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

  const responseContentType = response.headers.get("content-type") ?? "";
  if (!responseContentType.includes("application/json")) {
    // A file download (or any other non-JSON response): stream the
    // bytes back as-is rather than trying to parse them as JSON.
    const bytes = await response.arrayBuffer();
    const headers: Record<string, string> = { "Content-Type": responseContentType };
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers["Content-Disposition"] = disposition;
    return new NextResponse(bytes, { status: response.status, headers });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
