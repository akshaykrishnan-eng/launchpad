"use client";

import { useState } from "react";

import { LinkedInReviewResult } from "@/features/linkedin/LinkedInReviewResult";
import { requestLinkedInReview } from "@/lib/linkedin/client";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

type LinkedInProfileCardProps = {
  profile: LinkedInProfile;
  review: LinkedInReviewRequest | null;
  onEdit: () => void;
  onReviewRequested: (review: LinkedInReviewRequest) => void;
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Under Review",
  IN_REVIEW: "Under Review",
  COMPLETED: "Review Completed",
};

export function LinkedInProfileCard({
  profile,
  review,
  onEdit,
  onReviewRequested,
}: LinkedInProfileCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReviewActive = review !== null && review.status !== "COMPLETED";
  const displayUrl = profile.profile_url.replace(/^https?:\/\//, "");

  async function handleRequestReview() {
    setError(null);
    setIsRequesting(true);
    const result = await requestLinkedInReview();
    setIsRequesting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onReviewRequested(result.data);
  }

  return (
    <section aria-labelledby="linkedin-profile-heading" style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h2 id="linkedin-profile-heading" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
        LinkedIn Profile
      </h2>

      <p>
        <a href={profile.profile_url} target="_blank" rel="noreferrer">
          {displayUrl}
        </a>
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={onEdit} disabled={isReviewActive}>
          Edit URL
        </button>
        {!isReviewActive && (
          <button type="button" onClick={handleRequestReview} disabled={isRequesting}>
            {isRequesting ? "Requesting..." : "Request Review"}
          </button>
        )}
      </div>

      {isReviewActive && (
        <p style={{ opacity: 0.75, fontSize: "0.875rem" }}>
          You can&apos;t edit your URL while a review is in progress.
        </p>
      )}

      {error && <p role="alert">{error}</p>}

      {review && (
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Review Status</h3>
          <p>{STATUS_LABELS[review.status]}</p>

          {review.status === "COMPLETED" && review.result && (
            <LinkedInReviewResult result={review.result} />
          )}

          {review.status === "COMPLETED" && !review.result && (
            // Shouldn't normally happen (COMPLETED implies a result),
            // but never claim a review is done without one.
            <p>Review not completed yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
