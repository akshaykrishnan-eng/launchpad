import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getCreditTransactions } = vi.hoisted(() => ({
  getCreditTransactions: vi.fn(),
}));
vi.mock("@/lib/credits/client", () => ({ getCreditTransactions }));

import { CreditHistoryCentre } from "./CreditHistoryCentre";

function transaction(id: string) {
  return {
    id,
    credit_type: "RESUME_REVIEW",
    amount: -1,
    reason: "RESUME_REVIEW_REQUEST",
    description: `Transaction ${id}`,
    created_at: "2026-10-01T00:00:00Z",
  };
}

afterEach(() => {
  getCreditTransactions.mockReset();
});

describe("CreditHistoryCentre", () => {
  it("shows a loading state before data arrives", () => {
    getCreditTransactions.mockReturnValue(new Promise(() => {}));

    render(<CreditHistoryCentre />);

    expect(screen.getByText(/loading your credit history/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getCreditTransactions.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    render(<CreditHistoryCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getCreditTransactions.mockResolvedValueOnce({
      ok: true,
      data: { items: [transaction("t1")], total: 1, page: 1, page_size: 20 },
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Transaction t1")).toBeInTheDocument();
  });

  it("shows an empty state with no pagination when there is no history", async () => {
    getCreditTransactions.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1, page_size: 20 },
    });

    render(<CreditHistoryCentre />);

    expect(await screen.findByText("No credit activity yet.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("requests the first page with the full page size by default", async () => {
    getCreditTransactions.mockResolvedValue({
      ok: true,
      data: { items: [transaction("t1")], total: 1, page: 1, page_size: 20 },
    });

    render(<CreditHistoryCentre />);
    await screen.findByText("Transaction t1");

    expect(getCreditTransactions).toHaveBeenCalledWith({ page: 1, page_size: 20 });
  });

  it("does not fetch an unbounded number of rows: paginates across pages", async () => {
    getCreditTransactions.mockResolvedValueOnce({
      ok: true,
      data: { items: [transaction("t1")], total: 25, page: 1, page_size: 20 },
    });

    render(<CreditHistoryCentre />);
    await screen.findByText("Transaction t1");

    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    getCreditTransactions.mockResolvedValueOnce({
      ok: true,
      data: { items: [transaction("t2")], total: 25, page: 2, page_size: 20 },
    });
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(await screen.findByText("Transaction t2")).toBeInTheDocument();
    expect(getCreditTransactions).toHaveBeenCalledWith({ page: 2, page_size: 20 });
  });
});
