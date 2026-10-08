"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackLink } from "@/components/BackLink";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { CreditRequirement } from "@/features/credits/CreditRequirement";
import { ResumeUpload } from "@/features/resume/ResumeUpload";
import { getCredits } from "@/lib/credits/client";
import { RESUME_REVIEW_COST } from "@/lib/credits/types";
import { getReview, listResumes, requestReview } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

/** The "Resume" Career Asset step: a convenient first-time entry point
 * into the existing Resume Centre upload/review flow, not a second
 * implementation of it. Reuses ResumeUpload (upload) and
 * requestReview/CreditRequirement (review) exactly as Resume Centre
 * does -- uploading never touches credits, and a review is only ever
 * requested by an explicit click here, same atomic backend logic. */
export function ResumeAssetStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listResumes(), getCredits()]).then(async ([resumesResult, creditsResult]) => {
      if (!resumesResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      const latest = resumesResult.data.find((r) => r.is_latest) ?? null;
      setResume(latest);
      setCreditBalance(creditsResult.data.find((c) => c.credit_type === "RESUME_REVIEW")?.balance ?? 0);
      const reviewResult = latest ? await getReview(latest.id) : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  async function handleRequestReview() {
    setReviewError(null);
    setIsRequestingReview(true);
    const result = await requestReview(resume!.id);
    setIsRequestingReview(false);

    if (!result.ok) {
      setReviewError(result.error);
      return;
    }
    setReview(result.data);
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
      <BackLink href="/onboarding/goal">Back</BackLink>

      <section className="hero-panel" aria-label="Resume">
        <p className="hero-eyebrow">Career Assets</p>
        <h1 className="hero-title">{resume ? "Resume added" : "Add your resume"}</h1>
        <p className="hero-subtitle">
          {resume
            ? "Your resume is now part of your Launchpad profile."
            : "Your resume helps us understand your experience and gives you access to Resume Review."}
        </p>
      </section>

      {hasError && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          We couldn&apos;t load your resume status. You can continue and add it later from the Resume
          Centre.
        </p>
      )}

      {!resume && !hasError && <ResumeUpload onUploaded={setResume} />}

      {resume && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontWeight: 600 }}>{resume.original_filename}</p>

          {review ? (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Resume review requested -- we&apos;ll let you know when it&apos;s ready.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "0.9375rem" }}>Want feedback on your resume?</p>
              <CreditRequirement
                creditType="RESUME_REVIEW"
                required={RESUME_REVIEW_COST}
                balance={creditBalance}
                actionLabel="Request Resume Review"
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
        {!resume ? (
          <button type="button" className="btn-ghost" onClick={() => router.push("/onboarding/linkedin")}>
            I&apos;ll do this later
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn-primary" onClick={() => router.push("/onboarding/linkedin")}>
          Continue →
        </button>
      </div>
    </div>
  );
}
