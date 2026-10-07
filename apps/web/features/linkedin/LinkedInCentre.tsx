"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { LinkedInProfileCard } from "@/features/linkedin/LinkedInProfileCard";
import { LinkedInUrlForm } from "@/features/linkedin/LinkedInUrlForm";
import { getCredits } from "@/lib/credits/client";
import type { CreditBalance } from "@/lib/credits/types";
import { getLinkedInProfile, getLinkedInReview } from "@/lib/linkedin/client";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

export function LinkedInCentre() {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [review, setReview] = useState<LinkedInReviewRequest | null>(null);
  const [credits, setCredits] = useState<CreditBalance[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/resume/ResumeCentre.tsx for the fuller explanation.
  useEffect(() => {
    Promise.all([getLinkedInProfile(), getCredits()]).then(async ([profileResult, creditsResult]) => {
      if (!profileResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setProfile(profileResult.data);
      setCredits(creditsResult.data);
      const reviewResult = profileResult.data ? await getLinkedInReview() : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setIsEditing(false);
    Promise.all([getLinkedInProfile(), getCredits()]).then(async ([profileResult, creditsResult]) => {
      if (!profileResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setProfile(profileResult.data);
      setCredits(creditsResult.data);
      const reviewResult = profileResult.data ? await getLinkedInReview() : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading your LinkedIn Centre..." />;
  }

  if (hasError || !credits) {
    return (
      <ErrorState message="We couldn't load your LinkedIn Centre right now." onRetry={refresh} />
    );
  }

  const linkedinReviewBalance = credits.find((c) => c.credit_type === "LINKEDIN_REVIEW")?.balance ?? 0;

  if (!profile || isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!profile && (
          <EmptyState
            heading="No LinkedIn profile added yet"
            description="Add your LinkedIn profile URL to get started."
          />
        )}
        <LinkedInUrlForm
          initialUrl={profile?.profile_url ?? ""}
          onSaved={refresh}
          onCancel={profile ? () => setIsEditing(false) : undefined}
        />
      </div>
    );
  }

  return (
    <LinkedInProfileCard
      profile={profile}
      review={review}
      creditBalance={linkedinReviewBalance}
      onEdit={() => setIsEditing(true)}
      onReviewRequested={refresh}
    />
  );
}
