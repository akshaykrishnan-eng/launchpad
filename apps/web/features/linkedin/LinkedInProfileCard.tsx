"use client";

import { useState } from "react";

import { PageHero } from "@/components/PageHero";
import { ReviewDialog } from "@/components/ReviewDialog";
import { LinkedInIcon } from "@/components/icons";
import { CreditRequirement } from "@/features/credits/CreditRequirement";
import { LinkedInReviewStatusBadge } from "@/features/linkedin/LinkedInReviewStatusBadge";
import { LINKEDIN_REVIEW_COST } from "@/lib/credits/types";
import { requestLinkedInReview } from "@/lib/linkedin/client";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

type LinkedInProfileCardProps = {
  profile: LinkedInProfile;
  review: LinkedInReviewRequest | null;
  creditBalance: number;
  onEdit: () => void;
  onReviewRequested: (review: LinkedInReviewRequest) => void;
};

export function LinkedInProfileCard({
  profile,
  review,
  creditBalance,
  onEdit,
  onReviewRequested,
}: LinkedInProfileCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHero
        ariaLabel="LinkedIn profile overview"
        eyebrow="LinkedIn profile"
        metric={displayUrl}
        action={
          isReviewActive ? (
            <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.875rem" }}>Your review is in progress.</p>
          ) : (
            <CreditRequirement
              creditType="LINKEDIN_REVIEW"
              required={LINKEDIN_REVIEW_COST}
              balance={creditBalance}
              actionLabel="Request Review"
              pendingLabel="Requesting..."
              onAction={handleRequestReview}
              isActionPending={isRequesting}
              variant="hero"
            />
          )
        }
      />

      <section aria-labelledby="linkedin-profile-heading" className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              flexShrink: 0,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary-subtle)",
              color: "var(--color-primary-hover)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkedInIcon aria-hidden />
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="linkedin-profile-heading" style={{ fontSize: "1.0625rem" }}>
              LinkedIn Profile
            </h2>
            <p style={{ marginTop: "0.25rem" }}>
              <a href={profile.profile_url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                {displayUrl}
              </a>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border-subtle)" }}>
          <button type="button" onClick={onEdit} disabled={isReviewActive}>
            Edit URL
          </button>
        </div>

        {isReviewActive && (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            You can&apos;t edit your URL while a review is in progress.
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}
      </section>

      {review && (
        <section aria-label="Profile review" className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h3>Review Status</h3>
              <LinkedInReviewStatusBadge status={review.status} />
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setIsReviewOpen(true)}>
              View review →
            </button>
          </div>

          <ReviewDialog
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            kind="linkedin"
            status={review.status}
            result={review.result}
            documentLabel={displayUrl}
          />
        </section>
      )}
    </div>
  );
}
