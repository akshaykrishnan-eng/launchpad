import type { ReviewRequestStatus } from "@/lib/linkedin/types";

const LABELS: Record<ReviewRequestStatus, string> = {
  REQUESTED: "Under review",
  IN_REVIEW: "Under review",
  COMPLETED: "Review completed",
};

/** Mirrors features/resume/ResumeStatusBadge.tsx's visual language so the
 * two review workflows read as the same product. Text label is the actual
 * signal, not color alone -- color is just a visual accent on top of it. */
export function LinkedInReviewStatusBadge({ status }: { status: ReviewRequestStatus }) {
  const tone = status === "COMPLETED" ? "badge-success" : "badge-warning";
  return <span className={`badge ${tone}`}>Status: {LABELS[status]}</span>;
}
