import "server-only";

import { config } from "@/lib/config";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

/** Direct server-side calls to FastAPI, for Server Components (same
 * pattern as lib/candidate/backend.ts and lib/resume/backend.ts) --
 * not for client components, which go through /api/candidate/*
 * instead. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function getServerLinkedInProfile(accessToken: string) {
  return callApi<LinkedInProfile | null>("/api/v1/candidate/linkedin", accessToken);
}

export function getServerLinkedInReview(accessToken: string) {
  return callApi<LinkedInReviewRequest | null>(
    "/api/v1/candidate/linkedin/review",
    accessToken,
  );
}
