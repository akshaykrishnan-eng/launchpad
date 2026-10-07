import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { LinkedInReviewQueue } from "@/features/admin/LinkedInReviewQueue";
import { Pagination } from "@/features/admin/Pagination";
import { StatusFilter } from "@/features/admin/StatusFilter";
import { getServerLinkedInReviews } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function AdminLinkedInReviewsPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await getServerLinkedInReviews(accessToken, { page, page_size: PAGE_SIZE, status });

  return (
    <>
      <PageHeader title="LinkedIn Reviews" description="Work through candidate LinkedIn review requests." />

      <StatusFilter basePath="/admin/linkedin-reviews" current={status} />

      {!result ? (
        <AdminErrorState message="We couldn't load the LinkedIn review queue right now." />
      ) : (
        <>
          <LinkedInReviewQueue items={result.items} />
          <Pagination
            page={result.page}
            pageSize={result.page_size}
            total={result.total}
            basePath="/admin/linkedin-reviews"
            extraParams={status ? { status } : {}}
          />
        </>
      )}
    </>
  );
}
