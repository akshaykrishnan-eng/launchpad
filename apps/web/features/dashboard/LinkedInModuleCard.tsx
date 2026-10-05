import Link from "next/link";

import type { ReviewRequestStatus } from "@/lib/linkedin/types";

type LinkedInModuleCardProps = {
  /** null means no LinkedIn URL has ever been added -- an honest empty
   * state, not a fake default status. */
  hasProfile: boolean;
  reviewStatus: ReviewRequestStatus | null;
};

function label(hasProfile: boolean, reviewStatus: ReviewRequestStatus | null): string {
  if (!hasProfile) return "Not added";
  if (reviewStatus === "COMPLETED") return "Review completed";
  if (reviewStatus === "REQUESTED" || reviewStatus === "IN_REVIEW") return "Review in progress";
  return "Added";
}

export function LinkedInModuleCard({ hasProfile, reviewStatus }: LinkedInModuleCardProps) {
  return (
    <Link
      href="/app/linkedin"
      style={{
        display: "block",
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.5rem",
      }}
    >
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>LinkedIn</h2>
      <p>{label(hasProfile, reviewStatus)}</p>
    </Link>
  );
}
