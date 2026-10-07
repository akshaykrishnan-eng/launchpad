import Link from "next/link";

import { LinkedInReviewStatusBadge } from "@/features/linkedin/LinkedInReviewStatusBadge";
import type { LinkedInReviewQueueItem } from "@/lib/admin/types";
import type { ReviewRequestStatus } from "@/lib/linkedin/types";
import { formatDateTime } from "@/lib/mock-interviews/labels";

function candidateName(c: { first_name: string | null; last_name: string | null; email: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

export function LinkedInReviewQueue({ items }: { items: LinkedInReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No pending LinkedIn reviews</p>
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
              <th scope="col">Profile URL</th>
              <th scope="col">Requested</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ review, candidate }) => (
              <tr key={review.id}>
                <td>
                  <Link href={`/admin/candidates/${candidate.id}`} style={{ fontWeight: 600 }}>
                    {candidateName(candidate)}
                  </Link>
                </td>
                <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {review.profile_url_snapshot.replace(/^https?:\/\//, "")}
                </td>
                <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                  {formatDateTime(review.requested_at)}
                </td>
                <td>
                  <LinkedInReviewStatusBadge status={review.status as ReviewRequestStatus} />
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/admin/linkedin-reviews/${review.id}`} style={{ fontWeight: 600 }}>
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
