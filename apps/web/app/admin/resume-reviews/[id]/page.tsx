import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { ResumeReviewDetail } from "@/features/admin/ResumeReviewDetail";
import { getAccessToken } from "@/lib/auth/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminResumeReviewDetailPage({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <>
      <PageHeader title="Resume Review" description="Review the candidate's resume and record your feedback." />
      <ResumeReviewDetail reviewId={id} />
    </>
  );
}
