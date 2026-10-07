import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { ResumeHistoryCentre } from "@/features/resume/ResumeHistoryCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function ResumeHistoryPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app/resume">Resume Centre</BackLink>
        <PageHeader title="Resume History" description="Every version you've uploaded, newest first." />
      </div>
      <ResumeHistoryCentre />
    </div>
  );
}
