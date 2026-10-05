import type {
  LinkedInApiError,
  LinkedInProfile,
  LinkedInReviewRequest,
} from "@/lib/linkedin/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function errorMessage(body: LinkedInApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return body.detail;
  return body.detail.map((e) => e.msg).join("; ");
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

export const getLinkedInProfile = () => request<LinkedInProfile | null>("/linkedin");

export const saveLinkedInUrl = (profileUrl: string) =>
  request<LinkedInProfile>("/linkedin", {
    method: "PUT",
    body: JSON.stringify({ profile_url: profileUrl }),
  });

export const requestLinkedInReview = () =>
  request<LinkedInReviewRequest>("/linkedin/review", { method: "POST" });

export const getLinkedInReview = () =>
  request<LinkedInReviewRequest | null>("/linkedin/review");
