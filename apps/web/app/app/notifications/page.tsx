import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { NotificationsCentre } from "@/features/notifications/NotificationsCentre";
import { getAccessToken } from "@/lib/auth/session";

export default async function NotificationsPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app">Back to Dashboard</BackLink>
        <PageHeader
          title="Notifications"
          description="Stay up to date with your Launchpad activity."
        />
      </div>
      <NotificationsCentre />
    </div>
  );
}
