import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerCandidateCompletion } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerCandidateCompletion: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({ getServerCandidateCompletion }));

import OnboardingOverviewPage from "./page";

describe("OnboardingOverviewPage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(OnboardingOverviewPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows 0% and a continue link for a brand-new profile", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidateCompletion.mockResolvedValue({ completion_percentage: 0 });

    render(await OnboardingOverviewPage());

    expect(screen.getByText("0% complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue onboarding/i })).toHaveAttribute(
      "href",
      "/onboarding/about",
    );
  });

  it("shows the completion message and profile link at 100%", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidateCompletion.mockResolvedValue({ completion_percentage: 100 });

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Your Launchpad profile is complete.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view your profile/i })).toHaveAttribute(
      "href",
      "/app/profile",
    );
  });

  it("lists every onboarding step", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidateCompletion.mockResolvedValue({ completion_percentage: 40 });

    render(await OnboardingOverviewPage());

    for (const label of ["About You", "Education", "Skills", "Career Interests", "Career Goal"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
