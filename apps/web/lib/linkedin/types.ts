export type LinkedInProfile = {
  id: string;
  profile_url: string;
  created_at: string;
  updated_at: string;
};

export type ReviewerType = "HUMAN" | "AI" | "HYBRID";

export type LinkedInReviewResult = {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  reviewer_type: ReviewerType;
  created_at: string;
};

export type ReviewRequestStatus = "REQUESTED" | "IN_REVIEW" | "COMPLETED";

export type LinkedInReviewRequest = {
  id: string;
  status: ReviewRequestStatus;
  profile_url_snapshot: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: LinkedInReviewResult | null;
};

export type LinkedInApiError = { detail?: string | { msg: string; loc: unknown[] }[] };
