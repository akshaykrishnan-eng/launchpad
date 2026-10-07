import type {
  AdminApiError,
  AdminDashboard,
  AdminEventItem,
  AdminInterviewSlot,
  AdminLinkedInReviewRequest,
  AdminReviewRequest,
  Candidate360,
  CandidateListItem,
  CompleteInterviewPayload,
  CompleteReviewPayload,
  CreateEventPayload,
  CreateSlotPayload,
  CreditGrantTransaction,
  EventRegistrationAdminItem,
  GrantCreditPayload,
  InterviewFeedback,
  LinkedInReviewQueueItem,
  MockInterviewAdminItem,
  Page,
  ResumeReviewQueueItem,
  UpdateEventPayload,
} from "@/lib/admin/types";
import type { CreditTransaction } from "@/lib/mock-interviews/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Pydantic prefixes a field_validator's raised ValueError message with
// "Value error, " -- see lib/linkedin/client.ts for the original fix.
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

function errorMessage(body: AdminApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return cleanMessage(body.detail);
  return body.detail.map((e) => cleanMessage(e.msg)).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const getDashboard = () => request<AdminDashboard>("/dashboard");

export const getCandidates = (params: { page?: number; page_size?: number; search?: string }) =>
  request<Page<CandidateListItem>>(`/candidates${query(params)}`);

export const getCandidate360 = (candidateId: string) =>
  request<Candidate360>(`/candidates/${candidateId}`);

export const getResumeReviews = (params: { status?: string; page?: number; page_size?: number }) =>
  request<Page<ResumeReviewQueueItem>>(`/resume-reviews${query(params)}`);

export const getResumeReview = (reviewId: string) =>
  request<ResumeReviewQueueItem>(`/resume-reviews/${reviewId}`);

export const startResumeReview = (reviewId: string) =>
  request<AdminReviewRequest>(`/resume-reviews/${reviewId}/start`, { method: "POST" });

export const completeResumeReview = (reviewId: string, payload: CompleteReviewPayload) =>
  request<AdminReviewRequest>(`/resume-reviews/${reviewId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getLinkedInReviews = (params: { status?: string; page?: number; page_size?: number }) =>
  request<Page<LinkedInReviewQueueItem>>(`/linkedin-reviews${query(params)}`);

export const getLinkedInReview = (reviewId: string) =>
  request<LinkedInReviewQueueItem>(`/linkedin-reviews/${reviewId}`);

export const startLinkedInReview = (reviewId: string) =>
  request<AdminLinkedInReviewRequest>(`/linkedin-reviews/${reviewId}/start`, { method: "POST" });

export const completeLinkedInReview = (reviewId: string, payload: CompleteReviewPayload) =>
  request<AdminLinkedInReviewRequest>(`/linkedin-reviews/${reviewId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMockInterviews = (params: {
  status?: string;
  interview_type?: string;
  page?: number;
  page_size?: number;
}) => request<Page<MockInterviewAdminItem>>(`/mock-interviews${query(params)}`);

export const getMockInterview = (interviewId: string) =>
  request<MockInterviewAdminItem>(`/mock-interviews/${interviewId}`);

export const completeMockInterview = (interviewId: string, payload: CompleteInterviewPayload) =>
  request<InterviewFeedback>(`/mock-interviews/${interviewId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getSlots = (params: { interview_type?: string; page?: number; page_size?: number }) =>
  request<Page<AdminInterviewSlot>>(`/mock-interviews/slots${query(params)}`);

export const createSlot = (payload: CreateSlotPayload) =>
  request<AdminInterviewSlot>("/mock-interviews/slots", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getEvents = (params: {
  status?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}) => request<Page<AdminEventItem>>(`/events${query(params)}`);

export const getEvent = (eventId: string) => request<AdminEventItem>(`/events/${eventId}`);

export const getEventRegistrations = (
  eventId: string,
  params: { page?: number; page_size?: number },
) => request<Page<EventRegistrationAdminItem>>(`/events/${eventId}/registrations${query(params)}`);

export const createEvent = (payload: CreateEventPayload) =>
  request<AdminEventItem>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateEvent = (eventId: string, payload: UpdateEventPayload) =>
  request<AdminEventItem>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const publishEvent = (eventId: string) =>
  request<AdminEventItem>(`/events/${eventId}/publish`, { method: "POST" });

export const unpublishEvent = (eventId: string) =>
  request<AdminEventItem>(`/events/${eventId}/unpublish`, { method: "POST" });

export const cancelEvent = (eventId: string) =>
  request<AdminEventItem>(`/events/${eventId}/cancel`, { method: "POST" });

export const grantCredit = (payload: GrantCreditPayload) =>
  request<CreditTransaction>("/credits/grant", { method: "POST", body: JSON.stringify(payload) });

export const getCreditTransactions = (params: { page?: number; page_size?: number }) =>
  request<Page<CreditGrantTransaction>>(`/credits/transactions${query(params)}`);
