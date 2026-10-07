import { LinkedInIcon } from "@/components/icons";
import { ModuleSummaryCard } from "@/features/dashboard/ModuleSummaryCard";
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
    <ModuleSummaryCard
      href="/app/linkedin"
      icon={LinkedInIcon}
      title="LinkedIn"
      status={label(hasProfile, reviewStatus)}
    />
  );
}
