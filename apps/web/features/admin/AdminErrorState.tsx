"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";

/** Server Components can't handle a retry click themselves, so every
 * admin page's error state goes through this thin client wrapper
 * around router.refresh() -- same pattern as
 * features/dashboard/DashboardErrorState.tsx. */
export function AdminErrorState({ message }: { message: string }) {
  const router = useRouter();
  return <ErrorState message={message} onRetry={() => router.refresh()} />;
}
