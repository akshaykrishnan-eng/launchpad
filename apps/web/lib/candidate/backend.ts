import "server-only";

import { config } from "@/lib/config";
import type {
  CandidateProfile,
  CandidateSkill,
  CareerPreference,
  Education,
  ProfileCompletion,
  WorkExperience,
} from "@/lib/candidate/types";

/** Direct server-side calls to FastAPI, for Server Components rendering
 * a page (same pattern as lib/auth/session.ts::getCurrentUser) -- not
 * for client components, which go through /api/candidate/* instead. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function getServerCandidateProfile(accessToken: string) {
  return callApi<CandidateProfile>("/api/v1/candidate/profile", accessToken);
}

export function getServerCandidateCompletion(accessToken: string) {
  return callApi<ProfileCompletion>("/api/v1/candidate/completion", accessToken);
}

export function getServerEducation(accessToken: string) {
  return callApi<Education[]>("/api/v1/candidate/education", accessToken);
}

export function getServerSkills(accessToken: string) {
  return callApi<CandidateSkill[]>("/api/v1/candidate/skills", accessToken);
}

export function getServerExperience(accessToken: string) {
  return callApi<WorkExperience[]>("/api/v1/candidate/experience", accessToken);
}

export function getServerPreferences(accessToken: string) {
  return callApi<CareerPreference>("/api/v1/candidate/preferences", accessToken);
}
