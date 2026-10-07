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
vi.mock("@/lib/linkedin/client", () => ({
  getLinkedInProfile: vi.fn().mockResolvedValue({ ok: true, data: null }),
  getLinkedInReview: vi.fn().mockResolvedValue({ ok: true, data: null }),
  requestLinkedInReview: vi.fn(),
  saveLinkedInUrl: vi.fn(),
}));
vi.mock("@/lib/credits/client", () => ({
  getCredits: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { credit_type: "MOCK_INTERVIEW", balance: 0 },
      { credit_type: "CAREER_COACHING", balance: 0 },
      { credit_type: "RESUME_REVIEW", balance: 0 },
      { credit_type: "LINKEDIN_REVIEW", balance: 0 },
    ],
  }),
  getCreditTransactions: vi.fn(),
}));

import LinkedInCentrePage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
});

describe("LinkedInCentrePage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(LinkedInCentrePage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the LinkedIn Centre heading when authenticated", async () => {
    getAccessToken.mockResolvedValue("token");

    render(await LinkedInCentrePage());

    expect(screen.getByRole("heading", { name: /linkedin centre/i })).toBeInTheDocument();
    expect(await screen.findByText(/add your linkedin profile url/i)).toBeInTheDocument();
  });
});
