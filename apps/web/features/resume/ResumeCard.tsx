"use client";

import { useState } from "react";

import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import { ReviewResultView } from "@/features/resume/ReviewResultView";
import { downloadUrl, requestReview } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

type ResumeCardProps = {
  resume: Resume;
  review: ReviewRequest | null;
  onReviewRequested: (review: ReviewRequest) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResumeCard({ resume, review, onReviewRequested }: ResumeCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const hasActiveOrCompletedReview = review !== null;

  async function handleRequestReview() {
    setError(null);
    setIsRequesting(true);
    const result = await requestReview(resume.id);
    setIsRequesting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onReviewRequested(result.data);
  }

  return (
    <section aria-labelledby="my-resume-heading" style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h2 id="my-resume-heading" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
        My Resume
      </h2>

      <div>
        <p style={{ fontWeight: 600 }}>{resume.original_filename}</p>
        <p style={{ opacity: 0.75, fontSize: "0.875rem" }}>
          Version {resume.version} · Uploaded {formatDate(resume.uploaded_at)}
        </p>
      </div>

      <ResumeStatusBadge status={resume.status} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <a href={downloadUrl(resume.id)} download={resume.original_filename}>
          View / Download
        </a>

        {!hasActiveOrCompletedReview && (
          <button type="button" onClick={handleRequestReview} disabled={isRequesting}>
            {isRequesting ? "Requesting..." : "Request Review"}
          </button>
        )}
      </div>

      {error && <p role="alert">{error}</p>}

      {review?.status === "COMPLETED" && review.result && (
        <div>
          <button type="button" onClick={() => setShowFeedback((v) => !v)}>
            {showFeedback ? "Hide Feedback" : "View Feedback"}
          </button>
          {showFeedback && <ReviewResultView result={review.result} />}
        </div>
      )}

      {review?.status === "COMPLETED" && !review.result && (
        // Shouldn't normally happen (COMPLETED implies a result exists),
        // but the UI must never claim a review is done without one.
        <p>No review completed yet</p>
      )}
    </section>
  );
}
