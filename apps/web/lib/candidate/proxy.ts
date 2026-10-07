import "server-only";

import { NextResponse } from "next/server";

import { proxyApiRequest } from "@/lib/server-proxy";

/**
 * Server-side proxy for every `/api/v1/candidate/*` endpoint. One
 * implementation instead of ~15 near-identical Route Handlers,
 * matching the "Next.js BFF -> FastAPI /api/v1" architecture: the
 * browser only ever talks to this app's own /api/candidate/* path,
 * never the Docker-internal API hostname, and never holds a token.
 */
export async function proxyCandidateRequest(
  request: Request,
  pathSegments: string[],
): Promise<NextResponse> {
  const search = new URL(request.url).search;
  return proxyApiRequest(request, `/api/v1/candidate/${pathSegments.join("/")}${search}`);
}
