import { ResumeIcon } from "@/components/icons";
import { ModuleSummaryCard } from "@/features/dashboard/ModuleSummaryCard";
import type { ResumeStatus } from "@/lib/resume/types";

const STATUS_LABELS: Record<ResumeStatus, string> = {
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Review in progress",
  COMPLETED: "Review completed",
};

type ResumeModuleCardProps = {
  /** null means no resume has ever been uploaded -- an honest empty
   * state, not a fake default status. */
  status: ResumeStatus | null;
};

export function ResumeModuleCard({ status }: ResumeModuleCardProps) {
  return (
    <ModuleSummaryCard
      href="/app/resume"
      icon={ResumeIcon}
      title="Resume"
      status={status ? STATUS_LABELS[status] : "Not uploaded yet"}
    />
  );
}
