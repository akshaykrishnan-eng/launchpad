import Link from "next/link";

import { MockInterviewStatusBadge } from "@/features/mock-interviews/MockInterviewStatusBadge";
import type { MockInterviewAdminItem } from "@/lib/admin/types";
import { formatDateTime, interviewTitle } from "@/lib/mock-interviews/labels";

function candidateName(c: { first_name: string | null; last_name: string | null; email: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

export function MockInterviewAdminTable({ items }: { items: MockInterviewAdminItem[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No mock interviews booked</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          Bookings will appear here once a candidate reserves a slot.
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
              <th scope="col">Interview</th>
              <th scope="col">Date &amp; time</th>
              <th scope="col">Status</th>
              <th scope="col">Score</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ interview, candidate }) => (
              <tr key={interview.id}>
                <td>
                  <Link href={`/admin/candidates/${candidate.id}`} style={{ fontWeight: 600 }}>
                    {candidateName(candidate)}
                  </Link>
                </td>
                <td>{interviewTitle(interview)}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                  {formatDateTime(interview.scheduled_at)}
                </td>
                <td>
                  <MockInterviewStatusBadge status={interview.status} />
                </td>
                <td>{interview.feedback ? interview.feedback.overall_score : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  {interview.status === "BOOKED" && (
                    <Link href={`/admin/mock-interviews/${interview.id}`} style={{ fontWeight: 600 }}>
                      Complete
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
