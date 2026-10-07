"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHero } from "@/components/PageHero";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { BookingFlow } from "@/features/mock-interviews/BookingFlow";
import { InsufficientCreditNotice } from "@/features/mock-interviews/InsufficientCreditNotice";
import { InterviewHistory } from "@/features/mock-interviews/InterviewHistory";
import { UpcomingInterviews } from "@/features/mock-interviews/UpcomingInterviews";
import { getCredits, listInterviews } from "@/lib/mock-interviews/client";
import type { CreditBalance, MockInterview } from "@/lib/mock-interviews/types";

export function MockInterviewCentre() {
  const [credits, setCredits] = useState<CreditBalance[] | null>(null);
  const [interviews, setInterviews] = useState<MockInterview[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (not routed through a named helper), which is what keeps
  // Vitest's react-hooks/set-state-in-effect check happy -- see
  // features/resume/ResumeCentre.tsx for the fuller explanation.
  useEffect(() => {
    Promise.all([getCredits(), listInterviews()]).then(([creditsResult, interviewsResult]) => {
      if (!creditsResult.ok || !interviewsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setCredits(creditsResult.data);
      setInterviews(interviewsResult.data);
      setIsLoading(false);
    });
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setIsBooking(false);
    Promise.all([getCredits(), listInterviews()]).then(([creditsResult, interviewsResult]) => {
      if (!creditsResult.ok || !interviewsResult.ok) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setCredits(creditsResult.data);
      setInterviews(interviewsResult.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <CentreLoadingSkeleton label="Loading your Mock Interviews..." />;
  }

  if (hasError || !credits || !interviews) {
    return (
      <ErrorState message="We couldn't load your Mock Interviews right now." onRetry={refresh} />
    );
  }

  const mockInterviewBalance = credits.find((c) => c.credit_type === "MOCK_INTERVIEW")?.balance ?? 0;
  const upcoming = interviews
    .filter((i) => i.status === "BOOKED")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const history = interviews.filter((i) => i.status !== "BOOKED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <PageHero
        ariaLabel="Mock interview credits overview"
        eyebrow={`You have ${mockInterviewBalance} Mock Interview credit${mockInterviewBalance === 1 ? "" : "s"}`}
        metric={`${mockInterviewBalance} interview${mockInterviewBalance === 1 ? "" : "s"} available`}
        secondaryAction={
          <Link href="/app/credits" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#fff" }}>
            View Credits →
          </Link>
        }
        action={
          !isBooking && mockInterviewBalance > 0 ? (
            <button type="button" className="btn-primary hero-cta" onClick={() => setIsBooking(true)}>
              Book a Mock Interview
            </button>
          ) : undefined
        }
      />

      {isBooking && (
        <BookingFlow
          onCancel={() => setIsBooking(false)}
          onBooked={() => {
            refresh();
          }}
        />
      )}

      {!isBooking && mockInterviewBalance === 0 && <InsufficientCreditNotice available={mockInterviewBalance} />}

      {interviews.length === 0 ? (
        <EmptyState
          heading="No mock interviews yet"
          description="Book your first mock interview to start practicing."
        />
      ) : (
        <>
          <section className="page-section">
            <h2 className="page-section-title">Upcoming interviews</h2>
            <UpcomingInterviews interviews={upcoming} />
          </section>

          <section className="page-section">
            <h2 className="page-section-title">Past interviews</h2>
            <InterviewHistory interviews={history} />
          </section>
        </>
      )}
    </div>
  );
}
