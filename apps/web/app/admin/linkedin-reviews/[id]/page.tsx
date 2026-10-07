import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { LinkedInReviewDetail } from "@/features/admin/LinkedInReviewDetail";
import { getAccessToken } from "@/lib/auth/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminLinkedInReviewDetailPage({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <>
      <PageHeader title="LinkedIn Review" description="Review the candidate's LinkedIn profile and record your feedback." />
      <LinkedInReviewDetail reviewId={id} />
    </>
  );
}
