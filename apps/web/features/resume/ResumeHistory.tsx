"use client";

import Link from "next/link";
import { useState } from "react";

import { ReviewDialog } from "@/components/ReviewDialog";
import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import { downloadUrl, getReview } from "@/lib/resume/client";
import type { Resume, ReviewRequest } from "@/lib/resume/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateParts(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString(undefined, { day: "2-digit" }),
    month: date.toLocaleDateString(undefined, { month: "short" }),
  };
}

type ResumeHistoryProps = {
  resumes: Resume[];
  /** Preview mode: show only the `limit` most recent versions, plus a
   * "View all" link when there are more. Omit entirely for full mode
   * (the dedicated /app/resume/history page, which already receives
   * just one page of results from the server). */
  limit?: number;
  viewAllHref?: string;
};

/** Previous resume versions as a timeline list rather than a `<table>`
 * -- a table forces horizontal scrolling at narrow widths, which this
 * phase's redesign treats as something to design around rather than
 * tolerate (see CLAUDE.md responsive rules).
 *
 * Reused in two modes (PRD: recent preview + View all + dedicated
 * history page, never an unbounded render): pass `limit` for the
 * Resume Centre's compact preview, omit it for the full history page. */
export function ResumeHistory({ resumes, limit, viewAllHref = "/app/resume/history" }: ResumeHistoryProps) {
  const isPreview = limit !== undefined;
  // In preview mode, a single version is already fully covered by the
  // "current resume" card shown above it -- nothing extra to preview.
  if (isPreview && resumes.length <= 1) return null;

  const visible = isPreview ? resumes.slice(0, limit) : resumes;
  const hasMore = isPreview && resumes.length > (limit as number);

  return (
    <section aria-labelledby={isPreview ? "resume-history-heading" : undefined} className="card">
      {isPreview && (
        <div className="page-section-header">
          <h2 id="resume-history-heading" style={{ fontSize: "1rem" }}>
            Resume History
          </h2>
          {hasMore && (
            <Link href={viewAllHref} className="btn-ghost btn-sm" style={{ display: "inline-flex" }}>
              View all →
            </Link>
          )}
        </div>
      )}

      <ul style={{ listStyle: "none", marginTop: isPreview ? "0.5rem" : 0 }}>
        {visible.map((resume) => (
          <ResumeHistoryItem key={resume.id} resume={resume} />
        ))}
      </ul>
    </section>
  );
}

function ResumeHistoryItem({ resume }: { resume: Resume }) {
  const { day, month } = formatDateParts(resume.uploaded_at);
  const [review, setReview] = useState<ReviewRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // UPLOADED means no review was ever requested for this version --
  // nothing to show, so no trigger at all (mirrors the current-resume
  // card, which only shows "View review" once review !== null).
  const hasReview = resume.status !== "UPLOADED";

  async function handleViewReview() {
    if (review) {
      setIsOpen(true);
      return;
    }
    setIsLoading(true);
    const result = await getReview(resume.id);
    setIsLoading(false);
    if (result.ok && result.data) {
      setReview(result.data);
      setIsOpen(true);
    }
  }

  return (
    <li className="timeline-item">
      <div className="timeline-date-badge" aria-hidden="true">
        <span className="timeline-date-day">{day}</span>
        <span className="timeline-date-month">{month}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <p style={{ fontWeight: resume.is_latest ? 700 : 500 }}>
            v{resume.version}
            {resume.is_latest && " (latest)"}
          </p>
          <ResumeStatusBadge status={resume.status} />
        </div>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{resume.original_filename}</p>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
          Uploaded {formatDate(resume.uploaded_at)}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", alignItems: "flex-end", flexShrink: 0 }}>
        <a href={downloadUrl(resume.id)} download={resume.original_filename} className="btn-ghost btn-sm">
          Download
        </a>
        {hasReview && (
          <button type="button" className="btn-ghost btn-sm" onClick={handleViewReview} disabled={isLoading}>
            {isLoading ? "Loading..." : "View review →"}
          </button>
        )}
      </div>

      {review && (
        <ReviewDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
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
    </li>
  );
}
