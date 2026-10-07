import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { EventsCentre } from "@/features/events/EventsCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function EventsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader
          title="Events & Webinars"
          description="Stay connected with career events, webinars and opportunities from Launchpad."
        />
      </div>
      <EventsCentre />
    </div>
  );
}
