import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { ResumeCentre } from "@/features/resume/ResumeCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function ResumeCentrePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader title="Resume Centre" description="Manage your resume and review feedback." />
      </div>
      <ResumeCentre />
    </div>
  );
}
