"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { ResumeHistory } from "@/features/resume/ResumeHistory";
import { getResumeHistory } from "@/lib/resume/client";
import type { Resume } from "@/lib/resume/types";

const PAGE_SIZE = 20;

/** The complete, server-side-paginated resume version history --
 * mirrors features/credits/CreditHistoryCentre.tsx's convention
 * (recent preview + View all + dedicated paginated history page). */
export function ResumeHistoryCentre() {
  const [page, setPage] = useState(1);
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasError, setHasError] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body -- see features/credits/CreditHistoryCentre.tsx for why that
  // matters for the set-state-in-effect lint rule.
  useEffect(() => {
    getResumeHistory({ page, page_size: PAGE_SIZE }).then((result) => {
      if (!result.ok) {
        setHasError(true);
        return;
      }
      setHasError(false);
      setResumes(result.data.items);
      setTotal(result.data.total);
    });
  }, [page]);

  const refresh = useCallback(() => {
    setResumes(null);
    setHasError(false);
    getResumeHistory({ page, page_size: PAGE_SIZE }).then((result) => {
      if (!result.ok) {
        setHasError(true);
        return;
      }
      setResumes(result.data.items);
      setTotal(result.data.total);
    });
  }, [page]);

  if (resumes === null && !hasError) {
    return <CentreLoadingSkeleton label="Loading your Resume History..." />;
  }

  if (hasError) {
    return (
      <ErrorState message="We couldn't load your Resume History right now." onRetry={refresh} />
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        heading="No previous resume versions yet."
        description="Upload your first resume to start building your version history."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ResumeHistory resumes={resumes ?? []} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
