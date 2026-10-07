"use client";

import { useEffect, useState } from "react";

import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { ReviewCompletionForm } from "@/features/admin/ReviewCompletionForm";
import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import {
  completeResumeReview,
  getResumeReview,
  startResumeReview,
} from "@/lib/admin/client";
import type { CompleteReviewPayload, ResumeReviewQueueItem } from "@/lib/admin/types";
import { formatDateTime } from "@/lib/mock-interviews/labels";
import type { ResumeStatus } from "@/lib/resume/types";

function toResumeStatus(reviewStatus: string): ResumeStatus {
  return reviewStatus === "COMPLETED" ? "COMPLETED" : "UNDER_REVIEW";
}

export function ResumeReviewDetail({ reviewId }: { reviewId: string }) {
  const [item, setItem] = useState<ResumeReviewQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    getResumeReview(reviewId).then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setItem(result.data);
      setIsLoading(false);
    });
  }, [reviewId]);

  function refresh() {
    setIsLoading(true);
    setHasError(false);
    getResumeReview(reviewId).then((result) => {
      if (!result.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setItem(result.data);
      setIsLoading(false);
    });
  }

  async function handleStart() {
    setIsStarting(true);
    const result = await startResumeReview(reviewId);
    setIsStarting(false);
    if (result.ok) refresh();
  }

  async function handleComplete(payload: CompleteReviewPayload) {
    setCompleteError(null);
    setIsCompleting(true);
    const result = await completeResumeReview(reviewId, payload);
    setIsCompleting(false);
    if (!result.ok) {
      setCompleteError(result.error);
      return;
    }
    refresh();
  }

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading review..." />;
  }

  if (hasError || !item) {
    return <AdminErrorState message="We couldn't load this review right now." />;
  }

  const { review, candidate, resume_version, resume_filename } = item;
  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || candidate.email;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="card">
        <h2 style={{ marginBottom: "0.875rem" }}>Submission</h2>
        <dl style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Candidate: </dt>
            <dd style={{ display: "inline" }}>{name}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Resume: </dt>
            <dd style={{ display: "inline" }}>
              {resume_filename} (v{resume_version})
            </dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Requested: </dt>
            <dd style={{ display: "inline" }}>{formatDateTime(review.requested_at)}</dd>
          </div>
        </dl>
        <div style={{ marginTop: "0.875rem" }}>
          <ResumeStatusBadge status={toResumeStatus(review.status)} />
        </div>

        {review.status === "REQUESTED" && (
          <button type="button" className="btn-primary" onClick={handleStart} disabled={isStarting} style={{ marginTop: "0.875rem" }}>
            {isStarting ? "Starting..." : "Start Review"}
          </button>
        )}
      </section>

      {review.status === "COMPLETED" && review.result ? (
        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Feedback Given</h2>
          {review.result.score !== null && (
            <div style={{ marginBottom: "0.875rem" }}>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Score</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{review.result.score}</p>
            </div>
          )}
          <p>{review.result.summary}</p>
          {review.result.strengths.length > 0 && (
            <ResultList title="Strengths" items={review.result.strengths} />
          )}
          {review.result.improvements.length > 0 && (
            <ResultList title="Areas for improvement" items={review.result.improvements} />
          )}
          {review.result.recommendations.length > 0 && (
            <ResultList title="Recommendations" items={review.result.recommendations} />
          )}
        </section>
      ) : (
        // Completing directly from REQUESTED is allowed too -- Start
        // Review is an optional status update, not a hard prerequisite
        // (mirrors the backend, which only blocks completing an
        // already-COMPLETED review).
        <ReviewCompletionForm onComplete={handleComplete} isSubmitting={isCompleting} error={completeError} />
      )}
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <h3 style={{ fontSize: "0.9375rem" }}>{title}</h3>
      <ul style={{ marginTop: "0.25rem" }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
