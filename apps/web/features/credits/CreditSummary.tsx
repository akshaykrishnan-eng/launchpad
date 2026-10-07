import { StatTile } from "@/components/StatTile";
import { CREDIT_LABELS } from "@/lib/credits/types";
import type { CreditBalance } from "@/lib/credits/types";

export function CreditSummary({ balances }: { balances: CreditBalance[] }) {
  return (
    <div
      role="list"
      aria-label="Credit balances"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.75rem",
      }}
    >
      {balances.map((balance) => (
        <StatTile
          key={balance.credit_type}
          label={CREDIT_LABELS[balance.credit_type]}
          value={balance.balance}
          unit="credits"
        />
      ))}
    </div>
  );
}
