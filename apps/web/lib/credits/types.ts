export type CreditType = "MOCK_INTERVIEW" | "CAREER_COACHING" | "RESUME_REVIEW" | "LINKEDIN_REVIEW";

export type CreditBalance = {
  credit_type: CreditType;
  balance: number;
};

export type CreditTransaction = {
  id: string;
  credit_type: CreditType;
  amount: number;
  reason: string;
  description: string;
  created_at: string;
};

export const CREDIT_LABELS: Record<CreditType, string> = {
  MOCK_INTERVIEW: "Mock Interview",
  CAREER_COACHING: "Career Coaching",
  RESUME_REVIEW: "Resume Review",
  LINKEDIN_REVIEW: "LinkedIn Review",
};

// The current MVP cost for every credit-gated action is 1 -- see the
// matching *_CREDIT_COST constants in the API (app/core/resume.py,
// app/core/linkedin.py, app/core/mock_interview.py). The backend
// remains the authority on this; these are for UI copy only.
export const RESUME_REVIEW_COST = 1;
export const LINKEDIN_REVIEW_COST = 1;

export type CreditApiError = { detail?: string | { msg: string; loc: unknown[] }[] };
