import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CreditTransactionsTable } from "./CreditTransactionsTable";

describe("CreditTransactionsTable", () => {
  it("shows an empty-state message and no table when there are no transactions", () => {
    render(<CreditTransactionsTable items={[]} />);

    expect(screen.getByText("No credit transactions yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row per transaction, linking the candidate to their 360 page", () => {
    render(
      <CreditTransactionsTable
        items={[
          {
            transaction: { id: "t1", credit_type: "MOCK_INTERVIEW", amount: 3, reason: "PROMOTIONAL_GRANT", description: "Welcome credit", created_at: "2026-10-01T00:00:00Z" },
            candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
          },
          {
            transaction: { id: "t2", credit_type: "MOCK_INTERVIEW", amount: -1, reason: "BOOKING_SPEND", description: "", created_at: "2026-10-02T00:00:00Z" },
            candidate: { id: "c2", email: "sam@example.com", first_name: null, last_name: null },
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Dana Lee" })).toHaveAttribute("href", "/admin/candidates/c1");
    expect(screen.getByRole("link", { name: "sam@example.com" })).toHaveAttribute("href", "/admin/candidates/c2");
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("-1")).toBeInTheDocument();
    expect(screen.getByText("Welcome credit")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
