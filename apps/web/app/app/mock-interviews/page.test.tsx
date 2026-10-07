import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/mock-interviews/client", () => ({
  getCredits: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { credit_type: "MOCK_INTERVIEW", balance: 0 },
      { credit_type: "CAREER_COACHING", balance: 0 },
      { credit_type: "RESUME_REVIEW", balance: 0 },
      { credit_type: "LINKEDIN_REVIEW", balance: 0 },
    ],
  }),
  listInterviews: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  getCreditTransactions: vi.fn(),
  getAvailableSlots: vi.fn(),
  bookInterview: vi.fn(),
}));

import MockInterviewsPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
});

describe("MockInterviewsPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(MockInterviewsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the Mock Interviews heading when authenticated", async () => {
    getAccessToken.mockResolvedValue("token");

    render(await MockInterviewsPage());

    expect(screen.getByRole("heading", { name: /mock interviews/i })).toBeInTheDocument();
    expect(await screen.findByText(/improve your interview readiness/i)).toBeInTheDocument();
  });
});
