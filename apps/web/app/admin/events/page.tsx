import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminEventTable } from "@/features/admin/AdminEventTable";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { EventStatusFilter } from "@/features/admin/EventStatusFilter";
import { Pagination } from "@/features/admin/Pagination";
import { getServerEvents } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const events = await getServerEvents(accessToken, { status, page, page_size: PAGE_SIZE });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <PageHeader title="Events & Webinars" description="Create and manage career events and webinars." />
        <Link href="/admin/events/new" className="btn-primary" style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
          Create event
        </Link>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <EventStatusFilter current={status} />
      </div>

      {!events ? (
        <AdminErrorState message="We couldn't load events right now." />
      ) : (
        <>
          <AdminEventTable items={events.items} />
          <Pagination
            page={events.page}
            pageSize={events.page_size}
            total={events.total}
            basePath="/admin/events"
            extraParams={status ? { status } : {}}
          />
        </>
      )}
    </>
  );
}
