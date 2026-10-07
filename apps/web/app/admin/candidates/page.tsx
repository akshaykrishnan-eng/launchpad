import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { Pagination } from "@/features/admin/Pagination";
import { getServerCandidates } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/mock-interviews/labels";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<{ page?: string; search?: string }>;
};

export default async function AdminCandidatesPage({ searchParams }: PageProps) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const { page: pageParam, search } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await getServerCandidates(accessToken, { page, page_size: PAGE_SIZE, search });

  return (
    <>
      <PageHeader title="Candidates" description="Browse and search every registered candidate." />

      <form method="get" style={{ marginBottom: "1.25rem", maxWidth: "360px" }}>
        <label htmlFor="candidate-search">
          Search by name or email
          <input
            id="candidate-search"
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="e.g. Dana or dana@example.com"
          />
        </label>
      </form>

      {!result ? (
        <AdminErrorState message="We couldn't load the candidate list right now." />
      ) : result.items.length === 0 ? (
        <section className="card card-dashed" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600 }}>No candidates found</p>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            {search ? "Try a different search term." : "No candidates have registered yet."}
          </p>
        </section>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Status</th>
                    <th scope="col">Completion</th>
                    <th scope="col">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((candidate) => {
                    const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ");
                    return (
                      <tr key={candidate.id}>
                        <td>
                          <Link href={`/admin/candidates/${candidate.id}`} style={{ fontWeight: 600 }}>
                            {name || "—"}
                          </Link>
                        </td>
                        <td>{candidate.email}</td>
                        <td>{candidate.current_status ?? "—"}</td>
                        <td>{candidate.completion_percentage}%</td>
                        <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                          {formatDateTime(candidate.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={result.page}
            pageSize={result.page_size}
            total={result.total}
            basePath="/admin/candidates"
            extraParams={search ? { search } : {}}
          />
        </>
      )}
    </>
  );
}
