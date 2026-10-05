import type { ResumeApiError, Resume, ReviewRequest } from "@/lib/resume/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function errorMessage(body: ResumeApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return body.detail;
  return body.detail.map((e) => e.msg).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/candidate${path}`, init);

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

export const listResumes = () => request<Resume[]>("/resumes");

export function uploadResume(file: File): Promise<ApiResult<Resume>> {
  const formData = new FormData();
  formData.append("file", file);
  // No Content-Type set explicitly: the browser generates the
  // multipart boundary itself when the body is a FormData instance.
  return request<Resume>("/resumes", { method: "POST", body: formData });
}

export const requestReview = (resumeId: string) =>
  request<ReviewRequest>(`/resumes/${resumeId}/review`, { method: "POST" });

export const getReview = (resumeId: string) =>
  request<ReviewRequest | null>(`/resumes/${resumeId}/review`);

export function downloadUrl(resumeId: string): string {
  return `/api/candidate/resumes/${resumeId}/download`;
}
