import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { CreditTransactionsTable } from "@/features/admin/CreditTransactionsTable";
import { GrantCreditForm } from "@/features/admin/GrantCreditForm";
import { Pagination } from "@/features/admin/Pagination";
import { getServerCandidate360, getServerCreditTransactions } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";

const PAGE_SIZE = 20;

type PageProps = { searchParams: Promise<{ page?: string; candidate_id?: string }> };

export default async function AdminCreditsPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, candidate_id } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [transactions, prefillCandidate] = await Promise.all([
    getServerCreditTransactions(accessToken, { page, page_size: PAGE_SIZE }),
    candidate_id ? getServerCandidate360(accessToken, candidate_id) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader title="Credits" description="Grant credits to a candidate and review the ledger." />

      <section className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "0.875rem" }}>Grant Credits</h2>
        <GrantCreditForm
          initialCandidateId={candidate_id}
          initialCandidateLabel={
            prefillCandidate
              ? [prefillCandidate.profile.first_name, prefillCandidate.profile.last_name].filter(Boolean).join(" ") ||
                prefillCandidate.candidate.email
              : undefined
          }
        />
      </section>

      <section>
        <h2 style={{ marginBottom: "0.875rem" }}>Transaction History</h2>
        {!transactions ? (
          <AdminErrorState message="We couldn't load the credit ledger right now." />
        ) : (
          <>
            <CreditTransactionsTable items={transactions.items} />
            <Pagination
              page={transactions.page}
              pageSize={transactions.page_size}
              total={transactions.total}
              basePath="/admin/credits"
            />
          </>
        )}
      </section>
    </>
  );
}
