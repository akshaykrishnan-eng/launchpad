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
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.625rem",
        borderRadius: "999px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        backgroundColor: status === "COMPLETED" ? "#d1fae5" : "#fef3c7",
        color: status === "COMPLETED" ? "#065f46" : "#92400e",
      }}
    >
      Status: {LABELS[status]}
    </span>
  );
}
