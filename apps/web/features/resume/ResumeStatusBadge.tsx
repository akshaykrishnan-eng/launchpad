import type { ResumeStatus } from "@/lib/resume/types";

const LABELS: Record<ResumeStatus, string> = {
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Review completed",
};

const TONES: Record<ResumeStatus, string> = {
  UPLOADED: "badge-neutral",
  UNDER_REVIEW: "badge-warning",
  COMPLETED: "badge-success",
};

/** Text label is the actual signal, not color alone -- color is just a
 * visual accent on top of it. */
export function ResumeStatusBadge({ status }: { status: ResumeStatus }) {
  return <span className={`badge ${TONES[status]}`}>Status: {LABELS[status]}</span>;
}
