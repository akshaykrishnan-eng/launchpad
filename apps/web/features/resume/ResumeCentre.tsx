"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHero } from "@/components/PageHero";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { ResumeCard } from "@/features/resume/ResumeCard";
import { ResumeHistory } from "@/features/resume/ResumeHistory";
import { ResumeUpload } from "@/features/resume/ResumeUpload";
import { ResumeVersionUploadPanel } from "@/features/resume/ResumeVersionUploadPanel";
import { getCredits } from "@/lib/credits/client";
import type { CreditBalance } from "@/lib/credits/types";
import { getReview, listResumes } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResumeCentre() {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [credits, setCredits] = useState<CreditBalance[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll the upload panel into view and focus the heading after it mounts.
  // Only fires on open (isUploadOpen === true); the early-return guard prevents
  // spurious scrolls when the panel closes or on unrelated re-renders.
  useEffect(() => {
    if (!isUploadOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const rAF = requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
      panel.querySelector<HTMLElement>("h2")?.focus();
    });
    return () => cancelAnimationFrame(rAF);
  }, [isUploadOpen]);

  useEffect(() => {
    Promise.all([listResumes(), getCredits()]).then(async ([resumesResult, creditsResult]) => {
      if (!resumesResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setResumes(resumesResult.data);
      setCredits(creditsResult.data);
      const latest = resumesResult.data.find((r) => r.is_latest);
      const reviewResult = latest ? await getReview(latest.id) : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  // Used by retry/upload/review-request, never inside an effect.
  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    Promise.all([listResumes(), getCredits()]).then(async ([resumesResult, creditsResult]) => {
      if (!resumesResult.ok || !creditsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setResumes(resumesResult.data);
      setCredits(creditsResult.data);
      const latest = resumesResult.data.find((r) => r.is_latest);
      const reviewResult = latest ? await getReview(latest.id) : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  const handleUploaded = useCallback(() => {
    setIsUploadOpen(false);
    refresh();
  }, [refresh]);

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading your Resume Centre..." />;
  }

  if (hasError || !credits) {
    return (
      <ErrorState message="We couldn't load your Resume Centre right now." onRetry={refresh} />
    );
  }

  const resumeReviewBalance = credits.find((c) => c.credit_type === "RESUME_REVIEW")?.balance ?? 0;
  const latest = resumes?.find((r) => r.is_latest) ?? null;

  if (!latest) {
    return (
      <div className="page-section">
        <EmptyState
          heading="No resume uploaded yet"
          description="Upload a PDF, DOC, or DOCX to get started."
        />
        <ResumeUpload onUploaded={refresh} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHero
        ariaLabel="Current resume overview"
        eyebrow="Current resume"
        metric={latest.original_filename}
        description={`Version ${latest.version} · Uploaded ${formatDate(latest.uploaded_at)}`}
        action={
          <button type="button" className="btn-primary hero-cta" onClick={() => setIsUploadOpen((open) => !open)}>
            Upload new version
          </button>
        }
      />

      <ResumeCard
        resume={latest}
        review={review}
        creditBalance={resumeReviewBalance}
        onReviewRequested={refresh}
      />

      {isUploadOpen && (
        <ResumeVersionUploadPanel
          ref={panelRef}
          onUploaded={handleUploaded}
          onCancel={() => setIsUploadOpen(false)}
        />
      )}

      {resumes && <ResumeHistory resumes={resumes} limit={3} />}
    </div>
  );
}
