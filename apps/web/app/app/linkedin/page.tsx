import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { LinkedInCentre } from "@/features/linkedin/LinkedInCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function LinkedInCentrePage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader title="LinkedIn Centre" description="Improve your professional presence." />
      </div>
      <LinkedInCentre />
    </div>
  );
}
