import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { CreditsCentre } from "@/features/credits/CreditsCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function CreditsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader title="Credits" description="Manage the credits that unlock Launchpad's career services." />
      </div>
      <CreditsCentre />
    </div>
  );
}
