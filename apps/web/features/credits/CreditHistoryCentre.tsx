"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { CreditTransactionHistory } from "@/features/credits/CreditTransactionHistory";
import { getCreditTransactions } from "@/lib/credits/client";
import type { CreditTransaction } from "@/lib/credits/types";

const PAGE_SIZE = 20;

/** The complete, server-side-paginated credit ledger -- never fetched
 * in full. Each page change re-fetches exactly one page (see
 * PROJECT_STATUS.md's history-UX convention: recent preview + View all
 * + dedicated paginated history page, never an unbounded fetch). */
export function CreditHistoryCentre() {
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasError, setHasError] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/resume/ResumeCentre.tsx for the fuller explanation. No
  // setState call happens synchronously before the fetch, so changing
  // pages never triggers the same cascading-render warning.
  useEffect(() => {
    getCreditTransactions({ page, page_size: PAGE_SIZE }).then((result) => {
      if (!result.ok) {
        setHasError(true);
        return;
      }
      setHasError(false);
      setTransactions(result.data.items);
      setTotal(result.data.total);
    });
  }, [page]);

  const refresh = useCallback(() => {
    setTransactions(null);
    setHasError(false);
    getCreditTransactions({ page, page_size: PAGE_SIZE }).then((result) => {
      if (!result.ok) {
        setHasError(true);
        return;
      }
      setTransactions(result.data.items);
      setTotal(result.data.total);
    });
  }, [page]);

  if (transactions === null && !hasError) {
    return <CentreLoadingSkeleton label="Loading your Credit History..." />;
  }

  if (hasError) {
    return (
      <ErrorState message="We couldn't load your Credit History right now." onRetry={refresh} />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section className="card">
        <CreditTransactionHistory transactions={transactions ?? []} />
      </section>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
