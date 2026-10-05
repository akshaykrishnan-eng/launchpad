"use client";

import { useRouter } from "next/navigation";

export function DashboardErrorState() {
  const router = useRouter();

  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p>We couldn&apos;t load your dashboard right now.</p>
      <button type="button" onClick={() => router.refresh()} style={{ alignSelf: "center" }}>
        Retry
      </button>
    </div>
  );
}
