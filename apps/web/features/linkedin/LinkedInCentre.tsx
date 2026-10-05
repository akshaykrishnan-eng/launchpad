"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyLinkedInState } from "@/features/linkedin/EmptyLinkedInState";
import { LinkedInErrorState } from "@/features/linkedin/LinkedInErrorState";
import { LinkedInProfileCard } from "@/features/linkedin/LinkedInProfileCard";
import { LinkedInUrlForm } from "@/features/linkedin/LinkedInUrlForm";
import { getLinkedInProfile, getLinkedInReview } from "@/lib/linkedin/client";
import type { LinkedInProfile, LinkedInReviewRequest } from "@/lib/linkedin/types";

export function LinkedInCentre() {
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [review, setReview] = useState<LinkedInReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/resume/ResumeCentre.tsx for the fuller explanation.
  useEffect(() => {
    getLinkedInProfile().then(async (profileResult) => {
      if (!profileResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setProfile(profileResult.data);
      const reviewResult = profileResult.data ? await getLinkedInReview() : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setIsEditing(false);
    getLinkedInProfile().then(async (profileResult) => {
      if (!profileResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setProfile(profileResult.data);
      const reviewResult = profileResult.data ? await getLinkedInReview() : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <p style={{ padding: "2rem" }}>Loading your LinkedIn Centre...</p>;
  }

  if (hasError) {
    return <LinkedInErrorState onRetry={refresh} />;
  }

  if (!profile || isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!profile && <EmptyLinkedInState />}
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
      onEdit={() => setIsEditing(true)}
      onReviewRequested={refresh}
    />
  );
}
