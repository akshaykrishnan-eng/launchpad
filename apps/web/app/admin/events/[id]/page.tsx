import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { EventDetailAdmin } from "@/features/admin/EventDetailAdmin";
import { getAccessToken } from "@/lib/auth/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEventDetailPage({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <>
      <PageHeader title="Manage Event" description="Edit details, publish, cancel, and view registrations." />
      <EventDetailAdmin eventId={id} />
    </>
  );
}
