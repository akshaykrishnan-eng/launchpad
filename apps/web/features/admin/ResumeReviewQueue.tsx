import Link from "next/link";

import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import type { ResumeReviewQueueItem } from "@/lib/admin/types";
import { formatDateTime } from "@/lib/mock-interviews/labels";
import type { ResumeStatus } from "@/lib/resume/types";

function candidateName(c: { first_name: string | null; last_name: string | null; email: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

// ReviewRequestStatus ("REQUESTED"/"IN_REVIEW"/"COMPLETED") maps onto
// ResumeStatusBadge's labels ("Uploaded"/"Under review"/"Review
// completed") one-for-one once REQUESTED/IN_REVIEW both collapse to
// "under review" -- reusing the badge here keeps the queue visually
// consistent with the candidate-facing Resume Centre.
function toResumeStatus(reviewStatus: string): ResumeStatus {
  return reviewStatus === "COMPLETED" ? "COMPLETED" : "UNDER_REVIEW";
}

export function ResumeReviewQueue({ items }: { items: ResumeReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No pending resume reviews</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          New requests from candidates will show up here.
        </p>
      </section>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Resume</th>
              <th scope="col">Requested</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ review, candidate, resume_version, resume_filename }) => (
              <tr key={review.id}>
                <td>
                  <Link href={`/admin/candidates/${candidate.id}`} style={{ fontWeight: 600 }}>
                    {candidateName(candidate)}
                  </Link>
                </td>
                <td>
                  {resume_filename} <span style={{ color: "var(--color-text-secondary)" }}>(v{resume_version})</span>
                </td>
                <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                  {formatDateTime(review.requested_at)}
                </td>
                <td>
                  <ResumeStatusBadge status={toResumeStatus(review.status)} />
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/admin/resume-reviews/${review.id}`} style={{ fontWeight: 600 }}>
                    {review.status === "COMPLETED" ? "View" : "Review"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
