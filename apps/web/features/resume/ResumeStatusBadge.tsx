import type { ResumeStatus } from "@/lib/resume/types";

const LABELS: Record<ResumeStatus, string> = {
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Review completed",
};

/** Text label is the actual signal, not color alone -- color is just a
 * visual accent on top of it. */
export function ResumeStatusBadge({ status }: { status: ResumeStatus }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.625rem",
        borderRadius: "999px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        backgroundColor: status === "COMPLETED" ? "#d1fae5" : status === "UNDER_REVIEW" ? "#fef3c7" : "#e5e7eb",
        color: status === "COMPLETED" ? "#065f46" : status === "UNDER_REVIEW" ? "#92400e" : "#374151",
      }}
    >
      Status: {LABELS[status]}
    </span>
  );
}
