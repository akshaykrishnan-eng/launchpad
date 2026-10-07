import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const {
  redirect,
  getAccessToken,
  getServerDashboard,
  getServerResumes,
  getServerLinkedInProfile,
  getServerCredits,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerDashboard: vi.fn(),
  getServerResumes: vi.fn(),
  getServerLinkedInProfile: vi.fn(),
  getServerCredits: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({ getServerDashboard }));
vi.mock("@/lib/resume/backend", () => ({ getServerResumes }));
vi.mock("@/lib/linkedin/backend", () => ({ getServerLinkedInProfile }));
vi.mock("@/lib/mock-interviews/backend", () => ({ getServerCredits }));

import OnboardingOverviewPage from "./page";

function dashboard({
  percentage,
  components,
  nextAction,
}: {
  percentage: number;
  components: Partial<{
    personal_information: boolean;
    education: boolean;
    skills: boolean;
    experience: boolean;
    career_preferences: boolean;
    career_goal: boolean;
  }>;
  nextAction: { type: string; title: string; description: string; route: string };
}) {
  return {
    candidate: { first_name: "Sam", last_name: "Lee" },
    profile_completion: {
      percentage,
      components: {
        personal_information: false,
        education: false,
        skills: false,
        experience: false,
        career_preferences: false,
        career_goal: false,
        ...components,
      },
    },
    next_action: nextAction,
  };
}

describe("OnboardingOverviewPage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(OnboardingOverviewPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows 0% and the first step as the CTA for a brand-new profile", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(
      dashboard({
        percentage: 0,
        components: {},
        nextAction: {
          type: "PERSONAL_INFORMATION",
          title: "Complete your personal information",
          description: "Add your name, mobile number, city, and current status.",
          route: "/onboarding/about",
        },
      }),
    );

    render(await OnboardingOverviewPage());

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue to about you/i })).toHaveAttribute(
      "href",
      "/onboarding/about",
    );
  });

  it("highlights the first incomplete step as current when progress is partial", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(
      dashboard({
        percentage: 60,
        components: { personal_information: true, education: true },
        nextAction: {
          type: "SKILLS",
          title: "Add your skills",
          description: "List the skills you want recruiters to see.",
          route: "/onboarding/skills",
        },
      }),
    );

    render(await OnboardingOverviewPage());

    expect(screen.getByRole("link", { name: /continue to skills/i })).toHaveAttribute(
      "href",
      "/onboarding/skills",
    );
    expect(screen.getByRole("link", { name: /about you.*completed/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skills.*your next step/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /career goal.*up next/i })).toBeInTheDocument();
  });

  it("does not point the CTA at work experience when an onboarding step is still next", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(
      dashboard({
        percentage: 70,
        components: { personal_information: true, education: true, skills: true },
        nextAction: {
          type: "WORK_EXPERIENCE",
          title: "Add your work experience",
          description: "Add any job, internship, or part-time role you've held.",
          route: "/app/profile",
        },
      }),
    );

    render(await OnboardingOverviewPage());

    expect(screen.getByRole("link", { name: /continue to career interests/i })).toHaveAttribute(
      "href",
      "/onboarding/career",
    );
  });

  it("sends the candidate to their profile once all five onboarding steps are done but work experience remains", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(
      dashboard({
        percentage: 90,
        components: {
          personal_information: true,
          education: true,
          skills: true,
          career_preferences: true,
          career_goal: true,
        },
        nextAction: {
          type: "WORK_EXPERIENCE",
          title: "Add your work experience",
          description: "Add any job, internship, or part-time role you've held.",
          route: "/app/profile",
        },
      }),
    );

    render(await OnboardingOverviewPage());

    expect(screen.getByRole("link", { name: /go to your profile/i })).toHaveAttribute(
      "href",
      "/app/profile",
    );
  });

  function completeDashboard() {
    return dashboard({
      percentage: 100,
      components: {
        personal_information: true,
        education: true,
        skills: true,
        experience: true,
        career_preferences: true,
        career_goal: true,
      },
      nextAction: {
        type: "PROFILE_COMPLETE",
        title: "Your profile is complete \u{1F389}",
        description: "Nice work -- your Launchpad profile is fully filled out.",
        route: "/app/profile",
      },
    });
  }

  it("shows the completion hero at 100%", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([{ id: "r1", is_latest: true }]);
    getServerLinkedInProfile.mockResolvedValue({ id: "l1" });
    getServerCredits.mockResolvedValue([{ credit_type: "MOCK_INTERVIEW", balance: 2 }]);

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Your profile is complete 🎉")).toBeInTheDocument();
  });

  it("recommends uploading a resume when no resume exists", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerCredits.mockResolvedValue([]);

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Upload your resume")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upload resume/i })).toHaveAttribute("href", "/app/resume");
  });

  it("recommends adding LinkedIn when a resume exists but LinkedIn is missing", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([{ id: "r1", is_latest: true }]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerCredits.mockResolvedValue([]);

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Add your LinkedIn profile")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add linkedin/i })).toHaveAttribute("href", "/app/linkedin");
  });

  it("recommends booking a mock interview when resume and LinkedIn both exist and credits remain", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([{ id: "r1", is_latest: true }]);
    getServerLinkedInProfile.mockResolvedValue({ id: "l1" });
    getServerCredits.mockResolvedValue([{ credit_type: "MOCK_INTERVIEW", balance: 2 }]);

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Prepare for your next interview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book an interview/i })).toHaveAttribute(
      "href",
      "/app/mock-interviews",
    );
  });

  it("recommends the dashboard once nothing else is actionable", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([{ id: "r1", is_latest: true }]);
    getServerLinkedInProfile.mockResolvedValue({ id: "l1" });
    getServerCredits.mockResolvedValue([{ credit_type: "MOCK_INTERVIEW", balance: 0 }]);

    render(await OnboardingOverviewPage());

    expect(screen.getByText("Explore your Launchpad dashboard")).toBeInTheDocument();
  });

  it("always offers a way to the dashboard once onboarding is complete", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(completeDashboard());
    getServerResumes.mockResolvedValue([]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerCredits.mockResolvedValue([]);

    render(await OnboardingOverviewPage());

    expect(screen.getAllByRole("link", { name: /go to dashboard/i })[0]).toHaveAttribute("href", "/app");
  });

  it("lists every onboarding step", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(
      dashboard({
        percentage: 40,
        components: { personal_information: true, education: true },
        nextAction: {
          type: "SKILLS",
          title: "Add your skills",
          description: "List the skills you want recruiters to see.",
          route: "/onboarding/skills",
        },
      }),
    );

    render(await OnboardingOverviewPage());

    const journey = within(screen.getByRole("list"));
    for (const label of ["About You", "Education", "Skills", "Career Interests", "Career Goal"]) {
      expect(journey.getByRole("link", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("shows an error state and lets the candidate retry when the dashboard fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(null);

    render(await OnboardingOverviewPage());

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
