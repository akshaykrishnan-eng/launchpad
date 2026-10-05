export type ResumeStatus = "UPLOADED" | "UNDER_REVIEW" | "COMPLETED";

export type Resume = {
  id: string;
  version: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  status: ResumeStatus;
  uploaded_at: string;
  is_latest: boolean;
};

export type ReviewerType = "HUMAN" | "AI" | "HYBRID";

export type ReviewResult = {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  reviewer_type: ReviewerType;
  created_at: string;
};

export type ReviewRequestStatus = "REQUESTED" | "IN_REVIEW" | "COMPLETED";

export type ReviewRequest = {
  id: string;
  resume_id: string;
  status: ReviewRequestStatus;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: ReviewResult | null;
};

export type ResumeApiError = { detail?: string | { msg: string; loc: unknown[] }[] };
