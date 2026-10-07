import Link from "next/link";

import type { CreditGrantTransaction } from "@/lib/admin/types";
import type { CreditType } from "@/lib/mock-interviews/types";

const CREDIT_LABELS: Record<CreditType, string> = {
  MOCK_INTERVIEW: "Mock Interview",
  CAREER_COACHING: "Career Coaching",
  RESUME_REVIEW: "Resume Review",
  LINKEDIN_REVIEW: "LinkedIn Review",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CreditTransactionsTable({ items }: { items: CreditGrantTransaction[] }) {
  if (items.length === 0) {
    return (
      <section className="card card-dashed" style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>No credit transactions yet</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          Grants and spends will show up here.
        </p>
      </section>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Credit type</th>
              <th scope="col">Reason</th>
              <th scope="col">Description</th>
              <th scope="col">Date</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ transaction, candidate }) => {
              const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || candidate.email;
              return (
                <tr key={transaction.id}>
                  <td>
                    <Link href={`/admin/candidates/${candidate.id}`}>{name}</Link>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{CREDIT_LABELS[transaction.credit_type]}</td>
                  <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{transaction.reason}</td>
                  <td>{transaction.description || "—"}</td>
                  <td style={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {formatDate(transaction.created_at)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      color: transaction.amount > 0 ? "var(--color-success-text)" : "var(--color-text-primary)",
                    }}
                  >
                    {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
