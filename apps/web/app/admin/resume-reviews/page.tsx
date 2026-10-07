import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { Pagination } from "@/features/admin/Pagination";
import { ResumeReviewQueue } from "@/features/admin/ResumeReviewQueue";
import { StatusFilter } from "@/features/admin/StatusFilter";
import { getServerResumeReviews } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function AdminResumeReviewsPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, status } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await getServerResumeReviews(accessToken, { page, page_size: PAGE_SIZE, status });

  return (
    <>
      <PageHeader title="Resume Reviews" description="Work through candidate resume review requests." />

      <StatusFilter basePath="/admin/resume-reviews" current={status} />

      {!result ? (
        <AdminErrorState message="We couldn't load the resume review queue right now." />
      ) : (
        <>
          <ResumeReviewQueue items={result.items} />
          <Pagination
            page={result.page}
            pageSize={result.page_size}
            total={result.total}
            basePath="/admin/resume-reviews"
            extraParams={status ? { status } : {}}
          />
        </>
      )}
    </>
  );
}
