import "server-only";

import { config } from "@/lib/config";
import type { CreditBalance, MockInterview } from "@/lib/mock-interviews/types";

/** Direct server-side calls to FastAPI, for Server Components (same
 * pattern as lib/candidate/backend.ts, lib/resume/backend.ts, and
 * lib/linkedin/backend.ts) -- not for client components, which go
 * through /api/candidate/* instead. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function getServerCredits(accessToken: string) {
  return callApi<CreditBalance[]>("/api/v1/candidate/credits", accessToken);
}

export function getServerMockInterviews(accessToken: string) {
  return callApi<MockInterview[]>("/api/v1/candidate/mock-interviews", accessToken);
}
