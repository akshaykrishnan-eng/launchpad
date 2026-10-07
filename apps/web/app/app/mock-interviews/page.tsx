import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { MockInterviewCentre } from "@/features/mock-interviews/MockInterviewCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function MockInterviewsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader
          title="Mock Interviews"
          description="Practice interviews with experienced interviewers and improve your interview readiness."
        />
      </div>
      <MockInterviewCentre />
    </div>
  );
}
