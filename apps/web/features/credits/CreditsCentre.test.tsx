import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getCredits, getCreditTransactions } = vi.hoisted(() => ({
  getCredits: vi.fn(),
  getCreditTransactions: vi.fn(),
}));
vi.mock("@/lib/credits/client", () => ({ getCredits, getCreditTransactions }));

import { CreditsCentre } from "./CreditsCentre";

const BALANCES = [
  { credit_type: "MOCK_INTERVIEW", balance: 2 },
  { credit_type: "CAREER_COACHING", balance: 0 },
  { credit_type: "RESUME_REVIEW", balance: 1 },
  { credit_type: "LINKEDIN_REVIEW", balance: 0 },
];

function transaction(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    credit_type: "RESUME_REVIEW",
    amount: -1,
    reason: "RESUME_REVIEW_REQUEST",
    description: "Resume review request",
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  getCredits.mockReset();
  getCreditTransactions.mockReset();
});

describe("CreditsCentre", () => {
  it("shows a loading state before data arrives", () => {
    getCredits.mockReturnValue(new Promise(() => {}));
    getCreditTransactions.mockReturnValue(new Promise(() => {}));

    render(<CreditsCentre />);

    expect(screen.getByText(/loading your credits/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getCredits.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    getCreditTransactions.mockResolvedValueOnce({ ok: true, data: { items: [], total: 0, page: 1, page_size: 5 } });
    render(<CreditsCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getCredits.mockResolvedValueOnce({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValueOnce({ ok: true, data: { items: [], total: 0, page: 1, page_size: 5 } });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("No credit activity yet.")).toBeInTheDocument();
  });

  it("renders all four credit balances", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, page_size: 5 } });

    render(<CreditsCentre />);

    expect(await screen.findByText("Mock Interview")).toBeInTheDocument();
    expect(screen.getByText("Career Coaching")).toBeInTheDocument();
    expect(screen.getByText("Resume Review")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn Review")).toBeInTheDocument();
  });

  it("requests only the 5 most recent transactions", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({ ok: true, data: { items: [transaction("t1")], total: 1, page: 1, page_size: 5 } });

    render(<CreditsCentre />);
    await screen.findByText("Resume review request");

    expect(getCreditTransactions).toHaveBeenCalledWith({ page: 1, page_size: 5 });
  });

  it("renders recent transaction history", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({
      ok: true,
      data: { items: [transaction("t1")], total: 1, page: 1, page_size: 5 },
    });

    render(<CreditsCentre />);

    expect(await screen.findByText("Resume review request")).toBeInTheDocument();
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("shows a View all link when more history exists beyond the recent preview", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({
      ok: true,
      data: {
        items: [transaction("t1"), transaction("t2"), transaction("t3"), transaction("t4"), transaction("t5")],
        total: 12,
        page: 1,
        page_size: 5,
      },
    });

    render(<CreditsCentre />);
    await screen.findAllByText("Resume review request");

    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/app/credits/history");
  });

  it("omits the View all link when there is no additional history", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({
      ok: true,
      data: { items: [transaction("t1"), transaction("t2")], total: 2, page: 1, page_size: 5 },
    });

    render(<CreditsCentre />);
    await screen.findAllByText("Resume review request");

    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("shows an empty-history message when there is no credit activity", async () => {
    getCredits.mockResolvedValue({ ok: true, data: BALANCES });
    getCreditTransactions.mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, page_size: 5 } });

    render(<CreditsCentre />);

    expect(await screen.findByText("No credit activity yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });
});
