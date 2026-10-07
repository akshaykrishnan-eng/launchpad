import type { InterviewStatus } from "@/lib/mock-interviews/types";

const LABELS: Record<InterviewStatus, string> = {
  BOOKED: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const TONES: Record<InterviewStatus, string> = {
  COMPLETED: "badge-success",
  BOOKED: "badge-warning",
  CANCELLED: "badge-neutral",
};

/** Mirrors features/resume/ResumeStatusBadge.tsx and
 * features/linkedin/LinkedInReviewStatusBadge.tsx's visual language so
 * all three review/booking workflows read as the same product. Text
 * label is the actual signal, not color alone. */
export function MockInterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <span className={`badge ${TONES[status]}`}>{LABELS[status]}</span>;
}
