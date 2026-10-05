"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyResumeState } from "@/features/resume/EmptyResumeState";
import { ResumeCard } from "@/features/resume/ResumeCard";
import { ResumeErrorState } from "@/features/resume/ResumeErrorState";
import { ResumeHistory } from "@/features/resume/ResumeHistory";
import { ResumeUpload } from "@/features/resume/ResumeUpload";
import { getReview, listResumes } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

export function ResumeCentre() {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    listResumes().then(async (resumesResult) => {
      if (!resumesResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setResumes(resumesResult.data);
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
    listResumes().then(async (resumesResult) => {
      if (!resumesResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      setResumes(resumesResult.data);
      const latest = resumesResult.data.find((r) => r.is_latest);
      const reviewResult = latest ? await getReview(latest.id) : null;
      setReview(reviewResult?.ok ? reviewResult.data : null);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <p style={{ padding: "2rem" }}>Loading your Resume Centre...</p>;
  }

  if (hasError) {
    return <ResumeErrorState onRetry={refresh} />;
  }

  const latest = resumes?.find((r) => r.is_latest) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <ResumeUpload onUploaded={refresh} />

      {!latest && <EmptyResumeState />}

      {latest && <ResumeCard resume={latest} review={review} onReviewRequested={refresh} />}

      {resumes && <ResumeHistory resumes={resumes} />}
    </div>
  );
}
