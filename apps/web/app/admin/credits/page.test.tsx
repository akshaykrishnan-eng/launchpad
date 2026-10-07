import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerCreditTransactions, getServerCandidate360 } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerCreditTransactions: vi.fn(),
  getServerCandidate360: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerCreditTransactions, getServerCandidate360 }));

import AdminCreditsPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerCreditTransactions.mockReset();
  getServerCandidate360.mockReset();
});

describe("AdminCreditsPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminCreditsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows the grant form and an empty ledger message with no fake transactions", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCreditTransactions.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    render(await AdminCreditsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Grant Credits" })).toBeInTheDocument();
    expect(screen.getByLabelText("Candidate ID")).toBeInTheDocument();
    expect(screen.getByText("No credit transactions yet")).toBeInTheDocument();
    expect(getServerCandidate360).not.toHaveBeenCalled();
  });

  it("pre-fills the candidate when navigated to with a candidate_id and renders ledger rows", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCreditTransactions.mockResolvedValue({
      items: [
        {
          transaction: { id: "t1", credit_type: "MOCK_INTERVIEW", amount: 3, reason: "PROMOTIONAL_GRANT", description: "Welcome credit", created_at: "2026-10-01T00:00:00Z" },
          candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });
    getServerCandidate360.mockResolvedValue({
      candidate: { id: "c1", user_id: "u1", email: "dana@example.com", is_active: true, created_at: "x", last_login_at: null },
      profile: { id: "c1", user_id: "u1", first_name: "Dana", last_name: "Lee", mobile_number: null, current_city: null, current_status: null, degree: null, specialisation: null, graduation_year: null, career_goal: null, completion_percentage: 10 },
      education: [],
      skills: [],
      experience: [],
      career_preferences: { preferred_roles: [], preferred_locations: [] },
      resume: null,
      resume_review: null,
      linkedin: null,
      linkedin_review: null,
      interviews: [],
      credits: [],
    });

    render(await AdminCreditsPage({ searchParams: Promise.resolve({ candidate_id: "c1" }) }));

    expect(getServerCandidate360).toHaveBeenCalledWith("token", "c1");
    expect(screen.getByText(/Granting credits to/)).toBeInTheDocument();
    expect(screen.getAllByText("Dana Lee")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Dana Lee" })).toHaveAttribute("href", "/admin/candidates/c1");
    expect(screen.getByText("Welcome credit")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows an error state when the ledger fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCreditTransactions.mockResolvedValue(null);

    render(await AdminCreditsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
