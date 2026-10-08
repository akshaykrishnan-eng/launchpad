"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/BackLink";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { CreditRequirement } from "@/features/credits/CreditRequirement";
import { LinkedInUrlForm } from "@/features/linkedin/LinkedInUrlForm";
import { getCredits } from "@/lib/credits/client";
import { LINKEDIN_REVIEW_COST } from "@/lib/credits/types";
import { getLinkedInProfile, getLinkedInReview, requestLinkedInReview } from "@/lib/linkedin/client";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

/** The "LinkedIn" Career Asset step: a convenient first-time entry
 * point into the existing LinkedIn Centre save/review flow, not a
 * second implementation of it. Reuses LinkedInUrlForm (save) and
 * requestLinkedInReview/CreditRequirement (review) exactly as
 * LinkedIn Centre does -- saving the URL never touches credits, and a
 * review is only ever requested by an explicit click here, same
 * atomic backend logic. */
export function LinkedInAssetStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [review, setReview] = useState<LinkedInReviewRequest | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getLinkedInProfile(), getCredits()]).then(async ([profileResult, creditsResult]) => {
      if (!profileResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setProfile(profileResult.data);
      setCreditBalance(creditsResult.data.find((c) => c.credit_type === "LINKEDIN_REVIEW")?.balance ?? 0);
      const reviewResult = profileResult.data ? await getLinkedInReview() : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  async function handleRequestReview() {
    setReviewError(null);
    setIsRequestingReview(true);
    const result = await requestLinkedInReview();
    setIsRequestingReview(false);

    if (!result.ok) {
      setReviewError(result.error);
      return;
    }
    setReview(result.data);
  }

  function handleSaved() {
    getLinkedInProfile().then((result) => {
      if (result.ok) setProfile(result.data);
    });
  }

  if (isLoading) {
    return (
      <div className="page page-narrow onboarding-page">
        <CentreLoadingSkeleton label="Loading..." />
      </div>
    );
  }

  return (
    <div className="page page-narrow onboarding-page">
      <BackLink href="/onboarding/resume">Back</BackLink>

      <section className="hero-panel" aria-label="LinkedIn">
        <p className="hero-eyebrow">Career Assets</p>
        <h1 className="hero-title">{profile ? "LinkedIn added" : "Add your LinkedIn profile"}</h1>
        <p className="hero-subtitle">
          {profile
            ? "Your LinkedIn profile is now connected to your Launchpad profile."
            : "Your LinkedIn profile helps us build a better picture of your professional presence."}
        </p>
      </section>

      {hasError && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          We couldn&apos;t load your LinkedIn status. You can continue and add it later from the
          LinkedIn Centre.
        </p>
      )}

      {!profile && !hasError && <LinkedInUrlForm onSaved={handleSaved} />}

      {profile && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontWeight: 600 }}>{profile.profile_url.replace(/^https?:\/\//, "")}</p>

          {review ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              LinkedIn review requested -- we&apos;ll let you know when it&apos;s ready.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.9375rem" }}>Want feedback on your LinkedIn profile?</p>
              <CreditRequirement
                creditType="LINKEDIN_REVIEW"
                required={LINKEDIN_REVIEW_COST}
                balance={creditBalance}
                actionLabel="Request LinkedIn Review"
                pendingLabel="Requesting..."
                onAction={handleRequestReview}
                isActionPending={isRequestingReview}
              />
            </>
          )}

          {reviewError && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
              {reviewError}
            </p>
          )}
        </div>
      )}

      <div className="onboarding-step-actions">
        {!profile ? (
          <button type="button" className="btn-ghost" onClick={() => router.push("/onboarding")}>
            I&apos;ll do this later
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn-primary" onClick={() => router.push("/onboarding")}>
          Continue →
        </button>
      </div>
    </div>
  );
}
