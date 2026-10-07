"use client";

import { useEffect, useState } from "react";

import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { CompleteInterviewForm } from "@/features/admin/CompleteInterviewForm";
import { InterviewFeedbackView } from "@/features/mock-interviews/InterviewFeedbackView";
import { MockInterviewStatusBadge } from "@/features/mock-interviews/MockInterviewStatusBadge";
import { completeMockInterview, getMockInterview } from "@/lib/admin/client";
import type { CompleteInterviewPayload, MockInterviewAdminItem } from "@/lib/admin/types";
import { formatDateTime, interviewTitle } from "@/lib/mock-interviews/labels";

export function MockInterviewDetail({ interviewId }: { interviewId: string }) {
  const [item, setItem] = useState<MockInterviewAdminItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    getMockInterview(interviewId).then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setItem(result.data);
      setIsLoading(false);
    });
  }, [interviewId]);

  function refresh() {
    setIsLoading(true);
    setHasError(false);
    getMockInterview(interviewId).then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setItem(result.data);
      setIsLoading(false);
    });
  }

  async function handleComplete(payload: CompleteInterviewPayload) {
    setCompleteError(null);
    setIsSubmitting(true);
    const result = await completeMockInterview(interviewId, payload);
    setIsSubmitting(false);
    if (!result.ok) {
      setCompleteError(result.error);
      return;
    }
    refresh();
  }

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading interview..." />;
  }

  if (hasError || !item) {
    return <AdminErrorState message="We couldn't load this interview right now." />;
  }

  const { interview, candidate } = item;
  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || candidate.email;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="card">
        <h2 style={{ marginBottom: "0.875rem" }}>Booking</h2>
        <dl style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Candidate: </dt>
            <dd style={{ display: "inline" }}>{name}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Interview: </dt>
            <dd style={{ display: "inline" }}>{interviewTitle(interview)}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Scheduled: </dt>
            <dd style={{ display: "inline" }}>{formatDateTime(interview.scheduled_at)}</dd>
          </div>
        </dl>
        <div style={{ marginTop: "0.875rem" }}>
          <MockInterviewStatusBadge status={interview.status} />
        </div>
      </section>

      {interview.status === "COMPLETED" && interview.feedback ? (
        <section className="card">
          <InterviewFeedbackView feedback={interview.feedback} />
        </section>
      ) : interview.status === "BOOKED" ? (
        <CompleteInterviewForm onComplete={handleComplete} isSubmitting={isSubmitting} error={completeError} />
      ) : (
        <section className="card card-dashed" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>This interview was cancelled.</p>
        </section>
      )}
    </div>
  );
}
