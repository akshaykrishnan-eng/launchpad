"use client";

import { useEffect, useState } from "react";

import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { ReviewCompletionForm } from "@/features/admin/ReviewCompletionForm";
import { LinkedInReviewStatusBadge } from "@/features/linkedin/LinkedInReviewStatusBadge";
import {
  completeLinkedInReview,
  getLinkedInReview,
  startLinkedInReview,
} from "@/lib/admin/client";
import type { CompleteReviewPayload, LinkedInReviewQueueItem } from "@/lib/admin/types";
import type { ReviewRequestStatus } from "@/lib/linkedin/types";
import { formatDateTime } from "@/lib/mock-interviews/labels";

export function LinkedInReviewDetail({ reviewId }: { reviewId: string }) {
  const [item, setItem] = useState<LinkedInReviewQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  useEffect(() => {
    getLinkedInReview(reviewId).then((result) => {
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
    getLinkedInReview(reviewId).then((result) => {
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
    const result = await startLinkedInReview(reviewId);
    setIsStarting(false);
    if (result.ok) refresh();
  }

  async function handleComplete(payload: CompleteReviewPayload) {
    setCompleteError(null);
    setIsCompleting(true);
    const result = await completeLinkedInReview(reviewId, payload);
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

  const { review, candidate } = item;
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
            <dt style={{ display: "inline", fontWeight: 600 }}>Profile URL: </dt>
            <dd style={{ display: "inline" }}>
              <a href={review.profile_url_snapshot} target="_blank" rel="noreferrer">
                {review.profile_url_snapshot.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 600 }}>Requested: </dt>
            <dd style={{ display: "inline" }}>{formatDateTime(review.requested_at)}</dd>
          </div>
        </dl>
        <div style={{ marginTop: "0.875rem" }}>
          <LinkedInReviewStatusBadge status={review.status as ReviewRequestStatus} />
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
          {review.result.strengths.length > 0 && <ResultList title="Strengths" items={review.result.strengths} />}
          {review.result.improvements.length > 0 && (
            <ResultList title="Areas for improvement" items={review.result.improvements} />
          )}
          {review.result.recommendations.length > 0 && (
            <ResultList title="Recommendations" items={review.result.recommendations} />
          )}
        </section>
      ) : (
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
