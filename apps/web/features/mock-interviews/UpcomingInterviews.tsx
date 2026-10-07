import { MockInterviewStatusBadge } from "@/features/mock-interviews/MockInterviewStatusBadge";
import { formatDateTime, interviewTitle } from "@/lib/mock-interviews/labels";
import type { MockInterview } from "@/lib/mock-interviews/types";

function dateParts(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString(undefined, { day: "2-digit" }),
    month: date.toLocaleDateString(undefined, { month: "short" }),
  };
}

export function UpcomingInterviews({ interviews }: { interviews: MockInterview[] }) {
  if (interviews.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)" }}>No upcoming interviews booked.</p>;
  }

  return (
    <ul className="card" style={{ listStyle: "none" }}>
      {interviews.map((interview) => {
        const { day, month } = dateParts(interview.scheduled_at);
        return (
          <li key={interview.id} className="timeline-item">
            <div className="timeline-date-badge" aria-hidden="true">
              <span className="timeline-date-day">{day}</span>
              <span className="timeline-date-month">{month}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                <p style={{ fontWeight: 600 }}>{interviewTitle(interview)}</p>
                <MockInterviewStatusBadge status={interview.status} />
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{formatDateTime(interview.scheduled_at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
