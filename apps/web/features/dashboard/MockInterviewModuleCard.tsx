import { InterviewIcon } from "@/components/icons";
import { ModuleSummaryCard } from "@/features/dashboard/ModuleSummaryCard";
import { formatDateTime } from "@/lib/mock-interviews/labels";
import type { MockInterview } from "@/lib/mock-interviews/types";

type MockInterviewModuleCardProps = {
  /** null means credits couldn't be loaded -- treated the same as 0
   * rather than hiding the card. */
  mockInterviewBalance: number;
  interviews: MockInterview[];
};

function label(mockInterviewBalance: number, interviews: MockInterview[]): string {
  const nextUpcoming = interviews
    .filter((i) => i.status === "BOOKED")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
  if (nextUpcoming) {
    return `Next interview: ${formatDateTime(nextUpcoming.scheduled_at)}`;
  }

  const lastCompleted = interviews
    .filter((i) => i.status === "COMPLETED" && i.feedback)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
  if (lastCompleted?.feedback) {
    return `Last interview: Score ${lastCompleted.feedback.overall_score}`;
  }

  return `${mockInterviewBalance} credit${mockInterviewBalance === 1 ? "" : "s"} available`;
}

export function MockInterviewModuleCard({
  mockInterviewBalance,
  interviews,
}: MockInterviewModuleCardProps) {
  return (
    <ModuleSummaryCard
      href="/app/mock-interviews"
      icon={InterviewIcon}
      title="Mock Interviews"
      status={label(mockInterviewBalance, interviews)}
    />
  );
}
