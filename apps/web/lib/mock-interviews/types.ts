// Credit types/balances/transactions are platform-wide, not specific
// to Mock Interviews -- defined once in lib/credits/types.ts (the
// Credits Centre's own home) and re-exported here for the existing
// call sites in this module.
export type { CreditBalance, CreditTransaction, CreditType } from "@/lib/credits/types";

export type InterviewType = "HR" | "TECHNICAL" | "BEHAVIOURAL" | "ROLE_SPECIFIC" | "FINAL_PREP";

export type InterviewSlot = {
  id: string;
  interview_type: InterviewType;
  starts_at: string;
  ends_at: string;
};

export type InterviewStatus = "BOOKED" | "COMPLETED" | "CANCELLED";

export type InterviewFeedback = {
  communication_score: number;
  confidence_score: number;
  technical_score: number;
  answer_structure_score: number;
  professional_presentation_score: number;
  overall_score: number;
  feedback: string;
  recommendations: string[];
  created_at: string;
};

export type MockInterview = {
  id: string;
  interview_type: InterviewType;
  role: string | null;
  status: InterviewStatus;
  scheduled_at: string;
  created_at: string;
  feedback: InterviewFeedback | null;
};

export type MockInterviewApiError = {
  detail?: string | { msg: string; loc: unknown[] }[];
};
