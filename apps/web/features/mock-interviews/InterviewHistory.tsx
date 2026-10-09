"use client";

import { useCallback, useRef, useState } from "react";

import { InterviewFeedbackDialog } from "@/features/mock-interviews/InterviewFeedbackDialog";
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

type ItemProps = {
  interview: MockInterview;
  onViewFeedback: (id: string) => void;
  setTriggerRef: (id: string, el: HTMLButtonElement | null) => void;
};

function InterviewHistoryItem({ interview, onViewFeedback, setTriggerRef }: ItemProps) {
  const { day, month } = dateParts(interview.scheduled_at);

  return (
    <li className="timeline-item">
      <div className="timeline-date-badge" aria-hidden="true">
        <span className="timeline-date-day">{day}</span>
        <span className="timeline-date-month">{month}</span>
      </div>
      <div
        style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontWeight: 600 }}>{interviewTitle(interview)}</p>
          <MockInterviewStatusBadge status={interview.status} />
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          {formatDateTime(interview.scheduled_at)}
        </p>

        {interview.status === "COMPLETED" && interview.feedback && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            ref={(el) => setTriggerRef(interview.id, el)}
            onClick={() => onViewFeedback(interview.id)}
          >
            View Feedback
          </button>
        )}
      </div>
    </li>
  );
}

export function InterviewHistory({ interviews }: { interviews: MockInterview[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setTriggerRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      triggerRefs.current.set(id, el);
    } else {
      triggerRefs.current.delete(id);
    }
  }, []);

  const selectedInterview = selectedId
    ? (interviews.find((i) => i.id === selectedId) ?? null)
    : null;

  const handleClose = useCallback(() => {
    const id = selectedId;
    setSelectedId(null);
    if (id) {
      requestAnimationFrame(() => triggerRefs.current.get(id)?.focus());
    }
  }, [selectedId]);

  if (interviews.length === 0) {
    return <p style={{ color: "var(--color-text-secondary)" }}>No past interviews yet.</p>;
  }

  return (
    <>
      <ul className="card" style={{ listStyle: "none" }}>
        {interviews.map((interview) => (
          <InterviewHistoryItem
            key={interview.id}
            interview={interview}
            onViewFeedback={setSelectedId}
            setTriggerRef={setTriggerRef}
          />
        ))}
      </ul>
      <InterviewFeedbackDialog
        isOpen={!!selectedId}
        onClose={handleClose}
        interview={selectedInterview}
      />
    </>
  );
}
