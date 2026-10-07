import { CREDIT_LABELS } from "@/lib/credits/types";
import type { CreditTransaction } from "@/lib/credits/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CreditTransactionHistory({ transactions }: { transactions: CreditTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div>
        <p style={{ fontWeight: 600 }}>No credit activity yet.</p>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
          Your credit activity will appear here when credits are added or used.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
      <table>
        <thead>
          <tr>
            <th scope="col">Credit type</th>
            <th scope="col">Description</th>
            <th scope="col">Date</th>
            <th scope="col" style={{ textAlign: "right" }}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{CREDIT_LABELS[transaction.credit_type]}</td>
              <td>{transaction.description}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
