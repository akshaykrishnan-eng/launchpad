import type { InterviewType, MockInterview } from "@/lib/mock-interviews/types";

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  HR: "HR Interview",
  TECHNICAL: "Technical Interview",
  BEHAVIOURAL: "Behavioural Interview",
  ROLE_SPECIFIC: "Role-Specific Interview",
  FINAL_PREP: "Final Interview Prep",
};

/** Role-specific interviews show the candidate's chosen role instead of
 * the generic type label, e.g. "Python Backend Engineer Interview". */
export function interviewTitle(interview: Pick<MockInterview, "interview_type" | "role">): string {
  if (interview.interview_type === "ROLE_SPECIFIC" && interview.role) {
    return `${interview.role} Interview`;
  }
  return INTERVIEW_TYPE_LABELS[interview.interview_type];
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
