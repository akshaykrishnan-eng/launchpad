import "server-only";

import { NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/server-proxy";

/**
 * Server-side proxy for every `/api/v1/admin/*` endpoint -- same
 * pattern as lib/candidate/proxy.ts. Authorization is never trusted
 * from the browser: FastAPI's require_admin dependency re-checks the
 * caller's role from the database on every request, so a non-admin
 * token simply gets a 403 forwarded straight through.
 */
export async function proxyAdminRequest(
  request: Request,
  pathSegments: string[],
): Promise<NextResponse> {
  const search = new URL(request.url).search;
  return proxyApiRequest(request, `/api/v1/admin/${pathSegments.join("/")}${search}`);
}
