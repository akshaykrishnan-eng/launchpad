import "server-only";

import { config } from "@/lib/config";
import type {
  AdminDashboard,
  AdminEventItem,
  AdminInterviewSlot,
  Candidate360,
  CandidateListItem,
  CreditGrantTransaction,
  EventRegistrationAdminItem,
  LinkedInReviewQueueItem,
  MockInterviewAdminItem,
  Page,
  ResumeReviewQueueItem,
} from "@/lib/admin/types";

/** Direct server-side calls to FastAPI, for Server Components -- same
 * pattern as lib/candidate/backend.ts, lib/resume/backend.ts, etc. Not
 * for client components, which go through /api/admin/* instead. */
async function callApi<T>(path: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${config.internalApiUrl}/api/v1/admin${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getServerAdminDashboard(accessToken: string) {
  return callApi<AdminDashboard>("/dashboard", accessToken);
}

export function getServerCandidates(
  accessToken: string,
  params: { page?: number; page_size?: number; search?: string },
) {
  return callApi<Page<CandidateListItem>>(`/candidates${query(params)}`, accessToken);
}

export function getServerCandidate360(accessToken: string, candidateId: string) {
  return callApi<Candidate360>(`/candidates/${candidateId}`, accessToken);
}

export function getServerResumeReviews(
  accessToken: string,
  params: { status?: string; page?: number; page_size?: number },
) {
  return callApi<Page<ResumeReviewQueueItem>>(`/resume-reviews${query(params)}`, accessToken);
}

export function getServerLinkedInReviews(
  accessToken: string,
  params: { status?: string; page?: number; page_size?: number },
) {
  return callApi<Page<LinkedInReviewQueueItem>>(`/linkedin-reviews${query(params)}`, accessToken);
}

export function getServerMockInterviewsAdmin(
  accessToken: string,
  params: { status?: string; interview_type?: string; page?: number; page_size?: number },
) {
  return callApi<Page<MockInterviewAdminItem>>(`/mock-interviews${query(params)}`, accessToken);
}

export function getServerSlots(
  accessToken: string,
  params: { interview_type?: string; page?: number; page_size?: number },
) {
  return callApi<Page<AdminInterviewSlot>>(`/mock-interviews/slots${query(params)}`, accessToken);
}

export function getServerEvents(
  accessToken: string,
  params: { status?: string; event_type?: string; page?: number; page_size?: number },
) {
  return callApi<Page<AdminEventItem>>(`/events${query(params)}`, accessToken);
}

export function getServerEvent(accessToken: string, eventId: string) {
  return callApi<AdminEventItem>(`/events/${eventId}`, accessToken);
}

export function getServerEventRegistrations(
  accessToken: string,
  eventId: string,
  params: { page?: number; page_size?: number },
) {
  return callApi<Page<EventRegistrationAdminItem>>(
    `/events/${eventId}/registrations${query(params)}`,
    accessToken,
  );
}

export function getServerCreditTransactions(
  accessToken: string,
  params: { page?: number; page_size?: number },
) {
  return callApi<Page<CreditGrantTransaction>>(`/credits/transactions${query(params)}`, accessToken);
}
