import type {
  CandidateApiError,
  CandidateProfile,
  CandidateProfileUpdate,
  CandidateSkill,
  CareerPreference,
  Education,
  EducationInput,
  ProfileCompletion,
  WorkExperience,
  WorkExperienceInput,
} from "@/lib/candidate/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function errorMessage(body: CandidateApiError): string {
  if (!body.detail) return "Something went wrong. Please try again.";
  if (typeof body.detail === "string") return body.detail;
  return body.detail.map((e) => e.msg).join("; ");
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api/candidate${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, status: response.status, error: errorMessage(body) };
  }
  return { ok: true, data: body as T };
}

export const getProfile = () => request<CandidateProfile>("/profile");

export const updateProfile = (data: CandidateProfileUpdate) =>
  request<CandidateProfile>("/profile", { method: "PATCH", body: JSON.stringify(data) });

export const getCompletion = () => request<ProfileCompletion>("/completion");

export const listEducation = () => request<Education[]>("/education");

export const createEducation = (data: EducationInput) =>
  request<Education>("/education", { method: "POST", body: JSON.stringify(data) });

export const updateEducation = (id: string, data: Partial<EducationInput>) =>
  request<Education>(`/education/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteEducation = (id: string) =>
  request<void>(`/education/${id}`, { method: "DELETE" });

export const listSkills = () => request<CandidateSkill[]>("/skills");

export const addSkill = (name: string) =>
  request<CandidateSkill>("/skills", { method: "POST", body: JSON.stringify({ name }) });

export const removeSkill = (id: string) => request<void>(`/skills/${id}`, { method: "DELETE" });

export const listExperience = () => request<WorkExperience[]>("/experience");

export const createExperience = (data: WorkExperienceInput) =>
  request<WorkExperience>("/experience", { method: "POST", body: JSON.stringify(data) });

export const updateExperience = (id: string, data: Partial<WorkExperienceInput>) =>
  request<WorkExperience>(`/experience/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteExperience = (id: string) =>
  request<void>(`/experience/${id}`, { method: "DELETE" });

export const getPreferences = () => request<CareerPreference>("/preferences");

export const updatePreferences = (data: Partial<CareerPreference>) =>
  request<CareerPreference>("/preferences", { method: "PATCH", body: JSON.stringify(data) });
