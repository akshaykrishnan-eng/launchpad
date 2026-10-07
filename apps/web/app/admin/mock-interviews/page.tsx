import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { CreateSlotForm } from "@/features/admin/CreateSlotForm";
import { MockInterviewAdminTable } from "@/features/admin/MockInterviewAdminTable";
import { MockInterviewStatusFilter } from "@/features/admin/MockInterviewStatusFilter";
import { Pagination } from "@/features/admin/Pagination";
import { SlotsTable } from "@/features/admin/SlotsTable";
import { getServerMockInterviewsAdmin, getServerSlots } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function AdminMockInterviewsPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [interviews, slots] = await Promise.all([
    getServerMockInterviewsAdmin(accessToken, { status, page, page_size: PAGE_SIZE }),
    getServerSlots(accessToken, { page: 1, page_size: 50 }),
  ]);

  return (
    <>
      <PageHeader title="Mock Interviews" description="Manage interview slots and review bookings." />

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.875rem" }}>Create a Slot</h2>
        <CreateSlotForm />
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "0.875rem" }}>Slots</h2>
        {!slots ? (
          <AdminErrorState message="We couldn't load interview slots right now." />
        ) : (
          <SlotsTable slots={slots.items} />
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: "0.875rem" }}>Bookings</h2>
        <div style={{ marginBottom: "1rem" }}>
          <MockInterviewStatusFilter current={status} />
        </div>
        {!interviews ? (
          <AdminErrorState message="We couldn't load mock interview bookings right now." />
        ) : (
          <>
            <MockInterviewAdminTable items={interviews.items} />
            <Pagination
              page={interviews.page}
              pageSize={interviews.page_size}
              total={interviews.total}
              basePath="/admin/mock-interviews"
              extraParams={status ? { status } : {}}
            />
          </>
        )}
      </section>
    </>
  );
}
