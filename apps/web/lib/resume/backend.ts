import "server-only";

import { config } from "@/lib/config";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

/** Direct server-side calls to FastAPI, for Server Components (same
 * pattern as lib/candidate/backend.ts) -- not for client components,
 * which go through /api/candidate/* instead. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function getServerResumes(accessToken: string) {
  return callApi<Resume[]>("/api/v1/candidate/resumes", accessToken);
}

export function getServerReview(accessToken: string, resumeId: string) {
  return callApi<ReviewRequest | null>(
    `/api/v1/candidate/resumes/${resumeId}/review`,
    accessToken,
  );
}
