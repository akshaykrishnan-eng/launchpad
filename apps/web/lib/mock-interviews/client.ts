import { getCreditTransactions, getCredits } from "@/lib/credits/client";
import type {
  InterviewSlot,
  InterviewFeedback,
  InterviewType,
  MockInterview,
  MockInterviewApiError,
} from "@/lib/mock-interviews/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Pydantic prefixes a field_validator's raised ValueError message with
// "Value error, " in its 422 response -- strip that off so candidates
// never see a raw validation-library artifact in their error text (see
// lib/linkedin/client.ts for the original fix).
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/, "");
}

function errorMessage(body: MockInterviewApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return cleanMessage(body.detail);
  return body.detail.map((e) => cleanMessage(e.msg)).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/candidate${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

// Re-exported for existing call sites in this module -- the real
// implementation now lives in lib/credits/client.ts, the Credits
// Centre's own home.
export { getCredits, getCreditTransactions };

export const getAvailableSlots = (interviewType: InterviewType) =>
  request<InterviewSlot[]>(`/mock-interviews/slots?interview_type=${interviewType}`);

export const bookInterview = (slotId: string, role?: string) =>
  request<MockInterview>("/mock-interviews/book", {
    method: "POST",
    body: JSON.stringify({ slot_id: slotId, role: role || null }),
  });

export const listInterviews = () => request<MockInterview[]>("/mock-interviews");

export const getInterview = (interviewId: string) =>
  request<MockInterview>(`/mock-interviews/${interviewId}`);

export const getInterviewFeedback = (interviewId: string) =>
  request<InterviewFeedback | null>(`/mock-interviews/${interviewId}/feedback`);
