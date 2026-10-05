import Link from "next/link";

import type { ResumeStatus } from "@/lib/resume/types";

const STATUS_LABELS: Record<ResumeStatus, string> = {
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Review in progress",
  COMPLETED: "Review completed",
};

type ResumeModuleCardProps = {
  /** null means no resume has ever been uploaded -- an honest empty
   * state, not a fake default status. */
  status: ResumeStatus | null;
};

export function ResumeModuleCard({ status }: ResumeModuleCardProps) {
  return (
    <Link
      href="/app/resume"
      style={{
        display: "block",
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
      }}
    >
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Resume</h2>
      <p>{status ? STATUS_LABELS[status] : "Not uploaded yet"}</p>
    </Link>
  );
}
