import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { EventDetail } from "@/features/events/EventDetail";
import { getAccessToken } from "@/lib/auth/session";

type PageProps = { params: Promise<{ event_id: string }> };

export default async function EventDetailPage({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { event_id } = await params;

  return (
    <div className="page page-narrow">
      <div>
        <BackLink href="/app/events">Back to Events</BackLink>
      </div>
      <EventDetail eventId={event_id} />
    </div>
  );
}
