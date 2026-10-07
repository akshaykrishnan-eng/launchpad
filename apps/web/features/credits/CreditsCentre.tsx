"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { PageHero } from "@/components/PageHero";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { CreditSummary } from "@/features/credits/CreditSummary";
import { CreditTransactionHistory } from "@/features/credits/CreditTransactionHistory";
import { getCreditTransactions, getCredits } from "@/lib/credits/client";
import type { CreditBalance, CreditTransaction } from "@/lib/credits/types";

// Keep the Credits Centre focused: a small recent-activity preview,
// never the whole ledger (that's /app/credits/history's job).
const RECENT_ACTIVITY_LIMIT = 5;

export function CreditsCentre() {
  const [credits, setCredits] = useState<CreditBalance[] | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[] | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/resume/ResumeCentre.tsx for the fuller explanation.
  useEffect(() => {
    Promise.all([
      getCredits(),
      getCreditTransactions({ page: 1, page_size: RECENT_ACTIVITY_LIMIT }),
    ]).then(([creditsResult, transactionsResult]) => {
      if (!creditsResult.ok || !transactionsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setCredits(creditsResult.data);
      setRecentTransactions(transactionsResult.data.items);
      setTotalTransactions(transactionsResult.data.total);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    Promise.all([
      getCredits(),
      getCreditTransactions({ page: 1, page_size: RECENT_ACTIVITY_LIMIT }),
    ]).then(([creditsResult, transactionsResult]) => {
      if (!creditsResult.ok || !transactionsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setCredits(creditsResult.data);
      setRecentTransactions(transactionsResult.data.items);
      setTotalTransactions(transactionsResult.data.total);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading your Credits..." />;
  }

  if (hasError || !credits || !recentTransactions) {
    return <ErrorState message="We couldn't load your Credits right now." onRetry={refresh} />;
  }

  const hasMoreHistory = totalTransactions > recentTransactions.length;
  const totalBalance = credits.reduce((sum, balance) => sum + balance.balance, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHero
        ariaLabel="Available credits overview"
        eyebrow="Available credits"
        metric={`${totalBalance} ${totalBalance === 1 ? "credit" : "credits"}`}
        description="Use credits for mock interviews, resume reviews, LinkedIn reviews, and career coaching."
        action={
          <Link href="/app/credits/history" className="btn-primary hero-cta">
            View history
          </Link>
        }
      />

      <section className="card">
        <h2 className="page-section-title" style={{ marginBottom: "0.875rem" }}>
          Your credit balances
        </h2>
        <CreditSummary balances={credits} />
      </section>

      <section className="page-section">
        <div className="page-section-header">
          <h2 className="page-section-title">Recent activity</h2>
          {hasMoreHistory && (
            <Link href="/app/credits/history" className="btn-ghost btn-sm" style={{ display: "inline-flex" }}>
              View all →
            </Link>
          )}
        </div>
        <CreditTransactionHistory transactions={recentTransactions} />
      </section>
    </div>
  );
}
