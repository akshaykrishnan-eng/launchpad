"use client";

import { useState } from "react";

import { ReviewDialog } from "@/components/ReviewDialog";
import { ResumeIcon } from "@/components/icons";
import { CreditRequirement } from "@/features/credits/CreditRequirement";
import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import { RESUME_REVIEW_COST } from "@/lib/credits/types";
import { downloadUrl, requestReview } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

type ResumeCardProps = {
  resume: Resume;
  review: ReviewRequest | null;
  creditBalance: number;
  onReviewRequested: (review: ReviewRequest) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResumeCard({ resume, review, creditBalance, onReviewRequested }: ResumeCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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
    <section aria-labelledby="my-resume-heading" className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
          <ResumeIcon aria-hidden />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
            <h2 id="my-resume-heading" style={{ fontSize: "1.0625rem" }}>
              My Resume
            </h2>
            <span className="badge badge-info">Current</span>
          </div>
          <p style={{ fontWeight: 600, marginTop: "0.25rem" }}>{resume.original_filename}</p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Version {resume.version} · Uploaded {formatDate(resume.uploaded_at)}
          </p>
          <div style={{ marginTop: "0.5rem" }}>
            <ResumeStatusBadge status={resume.status} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border-subtle)" }}>
        <a href={downloadUrl(resume.id)} download={resume.original_filename} style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
          View / Download
        </a>

        {hasActiveOrCompletedReview && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setIsReviewOpen(true)}
            style={{ marginLeft: "auto" }}
          >
            View review →
          </button>
        )}
      </div>

      {!hasActiveOrCompletedReview && (
        <CreditRequirement
          creditType="RESUME_REVIEW"
          required={RESUME_REVIEW_COST}
          balance={creditBalance}
          actionLabel="Request Review"
          pendingLabel="Requesting..."
          onAction={handleRequestReview}
          isActionPending={isRequesting}
        />
      )}

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}

      {review && (
        <ReviewDialog
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          kind="resume"
          status={review.status}
          result={review.result}
          documentLabel={
            <>
              {resume.original_filename}
              <br />
              Version {resume.version}
            </>
          }
        />
      )}
    </section>
  );
}
