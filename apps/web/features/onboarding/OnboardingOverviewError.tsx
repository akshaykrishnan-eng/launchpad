"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";

export function OnboardingOverviewError() {
  const router = useRouter();

  return (
    <ErrorState
      message="We couldn't load your onboarding progress right now."
      onRetry={() => router.refresh()}
    />
  );
}
