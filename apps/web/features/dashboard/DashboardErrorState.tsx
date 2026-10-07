"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";

export function DashboardErrorState() {
  const router = useRouter();

  return (
    <ErrorState
      message="We couldn't load your dashboard right now."
      onRetry={() => router.refresh()}
    />
  );
}
