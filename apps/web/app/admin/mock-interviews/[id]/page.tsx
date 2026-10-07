import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { MockInterviewDetail } from "@/features/admin/MockInterviewDetail";
import { getAccessToken } from "@/lib/auth/session";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminMockInterviewDetailPage({ params }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <>
      <PageHeader title="Complete Mock Interview" description="Mark the interview complete and record feedback." />
      <MockInterviewDetail interviewId={id} />
    </>
  );
}
