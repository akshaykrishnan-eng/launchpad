import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerDashboard } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerDashboard: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({ getServerDashboard }));

import CandidateDashboardPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerDashboard.mockClear();
});

const SAMPLE_DASHBOARD = {
  candidate: { first_name: "Dana", last_name: "Smith" },
  profile_completion: {
    percentage: 40,
    components: {
      personal_information: true,
      education: true,
      skills: false,
      experience: false,
      career_preferences: false,
      career_goal: false,
    },
  },
  next_action: {
    type: "SKILLS",
    title: "Add your skills",
    description: "List the skills you want recruiters to see.",
    route: "/onboarding/skills",
  },
};

describe("CandidateDashboardPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(CandidateDashboardPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows an error state when the dashboard fails to load, without redirecting", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(null);

    render(await CandidateDashboardPage());

    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load your dashboard");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("greets the candidate by their real first name", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    render(await CandidateDashboardPage());

    expect(screen.getByText(/Hi Dana/)).toBeInTheDocument();
  });

  it("renders the completion percentage from the backend", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    render(await CandidateDashboardPage());

    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("renders the readiness breakdown using backend component states", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    render(await CandidateDashboardPage());

    // The ✓/○ glyphs are aria-hidden (completion state is also spelled
    // out in visible text, not conveyed by the symbol/color alone), so
    // the link's accessible name is just the label.
    const educationLink = screen.getByRole("link", { name: "Education" });
    const skillsLink = screen.getByRole("link", { name: "Skills" });
    expect(educationLink).toHaveAttribute("href", "/onboarding/education");
    expect(skillsLink).toHaveAttribute("href", "/onboarding/skills");
    expect(educationLink.parentElement).toHaveTextContent("Complete");
    expect(skillsLink.parentElement).toHaveTextContent("Incomplete");
  });

  it("renders the next action and lets the candidate navigate to it", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    render(await CandidateDashboardPage());

    expect(screen.getByText("Add your skills")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go now/i })).toHaveAttribute(
      "href",
      "/onboarding/skills",
    );
  });

  it("shows the completion celebration when the profile is fully complete", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue({
      ...SAMPLE_DASHBOARD,
      profile_completion: {
        percentage: 100,
        components: {
          personal_information: true,
          education: true,
          skills: true,
          experience: true,
          career_preferences: true,
          career_goal: true,
        },
      },
      next_action: {
        type: "PROFILE_COMPLETE",
        title: "Your profile is complete \u{1F389}",
        description: "Nice work.",
        route: "/app/profile",
      },
    });

    render(await CandidateDashboardPage());

    expect(screen.getByText(/profile is complete/)).toBeInTheDocument();
    expect(screen.queryByText("Complete Profile →")).not.toBeInTheDocument();
  });

  it("shows every future module as a non-functional placeholder", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    render(await CandidateDashboardPage());

    for (const title of ["Resume", "LinkedIn", "Mock Interviews", "Events", "Career Coaching", "Jobs"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Coming soon")).toHaveLength(6);
  });

  it("lays out cards with a reflowing grid rather than a fixed desktop width", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    const { container } = render(await CandidateDashboardPage());

    const grids = container.querySelectorAll('[style*="auto-fit"]');
    expect(grids.length).toBeGreaterThan(0);
  });
});
