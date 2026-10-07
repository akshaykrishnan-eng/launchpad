import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { CreateEventPageClient } from "@/features/admin/CreateEventPageClient";
import { getAccessToken } from "@/lib/auth/session";

export default async function CreateEventPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader title="Create Event" description="Set up a new career event or webinar." />
      <CreateEventPageClient />
    </>
  );
}
