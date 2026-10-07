import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { CreditHistoryCentre } from "@/features/credits/CreditHistoryCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function CreditHistoryPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app/credits">Credits</BackLink>
        <PageHeader title="Credit History" description="Your complete credit transaction history." />
      </div>
      <CreditHistoryCentre />
    </div>
  );
}
