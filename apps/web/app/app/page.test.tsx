import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  redirect,
  getAccessToken,
  getServerDashboard,
  getServerResumes,
  getServerLinkedInProfile,
  getServerLinkedInReview,
  getServerCredits,
  getServerMockInterviews,
  getServerEvents,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerDashboard: vi.fn(),
  getServerResumes: vi.fn(),
  getServerLinkedInProfile: vi.fn(),
  getServerLinkedInReview: vi.fn(),
  getServerCredits: vi.fn(),
  getServerMockInterviews: vi.fn(),
  getServerEvents: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({ getServerDashboard }));
vi.mock("@/lib/resume/backend", () => ({ getServerResumes }));
vi.mock("@/lib/linkedin/backend", () => ({ getServerLinkedInProfile, getServerLinkedInReview }));
vi.mock("@/lib/mock-interviews/backend", () => ({ getServerCredits, getServerMockInterviews }));
vi.mock("@/lib/events/backend", () => ({ getServerEvents }));

import CandidateDashboardPage from "./page";

afterEach(() => {
  // redirect keeps its throw-on-call implementation (set above via
  // vi.hoisted) across tests, so it's only cleared, not reset. The
  // rest have no fixed implementation, so resetting them (not just
  // clearing call history) prevents a resolved value configured in
  // one test from leaking into the next.
  redirect.mockClear();
  getAccessToken.mockReset();
  getServerDashboard.mockReset();
  getServerResumes.mockReset();
  getServerLinkedInProfile.mockReset();
  getServerLinkedInReview.mockReset();
  getServerCredits.mockReset();
  getServerMockInterviews.mockReset();
  getServerEvents.mockReset();
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

    expect(screen.getByText(/Welcome back, Dana/)).toBeInTheDocument();
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

  it("shows every still-unimplemented module as a non-functional placeholder", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerResumes.mockResolvedValue([]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerEvents.mockResolvedValue([]);

    render(await CandidateDashboardPage());

    for (const title of ["Career Coaching", "Jobs"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    // Mock Interviews and Events are no longer placeholders -- they
    // get real status cards (see the dedicated tests below), not
    // "Coming soon".
    expect(screen.getByRole("heading", { name: "Mock Interviews" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Events & Webinars" })).toBeInTheDocument();
  });

  it("shows the next upcoming event on the Events module card", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerResumes.mockResolvedValue([]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Breaking Into Product Engineering",
        description: "desc",
        event_type: "WEBINAR",
        status: "PUBLISHED",
        starts_at: "2026-11-20T18:00:00Z",
        ends_at: "2026-11-20T19:00:00Z",
        timezone: "IST",
        location: null,
        meeting_url: null,
        is_registered: false,
      },
    ]);

    render(await CandidateDashboardPage());

    expect(screen.getByText(/Next: Breaking Into Product Engineering/)).toBeInTheDocument();
  });

  it("shows no upcoming events when the candidate has none", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerResumes.mockResolvedValue([]);
    getServerLinkedInProfile.mockResolvedValue(null);
    getServerEvents.mockResolvedValue([]);

    render(await CandidateDashboardPage());

    expect(screen.getByText("No upcoming events")).toBeInTheDocument();
  });

  it("shows the Mock Interview module's credit balance when no interview has ever happened", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerCredits.mockResolvedValue([
      { credit_type: "MOCK_INTERVIEW", balance: 3 },
      { credit_type: "CAREER_COACHING", balance: 0 },
      { credit_type: "RESUME_REVIEW", balance: 0 },
      { credit_type: "LINKEDIN_REVIEW", balance: 0 },
    ]);
    getServerMockInterviews.mockResolvedValue([]);

    render(await CandidateDashboardPage());

    const mockInterviewLinks = screen.getAllByRole("link", { name: /mock interviews/i });
    const card = mockInterviewLinks.find(
      (link) => link.getAttribute("href") === "/app/mock-interviews",
    );
    expect(card).toBeDefined();
    expect(screen.getByText("3 credits available")).toBeInTheDocument();
  });

  it("shows the Mock Interview module's next upcoming interview when one is booked", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerCredits.mockResolvedValue([{ credit_type: "MOCK_INTERVIEW", balance: 0 }]);
    getServerMockInterviews.mockResolvedValue([
      {
        id: "mi1",
        interview_type: "HR",
        role: null,
        status: "BOOKED",
        scheduled_at: "2026-10-10T10:00:00Z",
        created_at: "x",
        feedback: null,
      },
    ]);

    render(await CandidateDashboardPage());

    expect(screen.getByText(/Next interview:/)).toBeInTheDocument();
  });

  it("shows the Mock Interview module's last completed score when no interview is upcoming", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerCredits.mockResolvedValue([{ credit_type: "MOCK_INTERVIEW", balance: 0 }]);
    getServerMockInterviews.mockResolvedValue([
      {
        id: "mi1",
        interview_type: "HR",
        role: null,
        status: "COMPLETED",
        scheduled_at: "2026-09-01T10:00:00Z",
        created_at: "x",
        feedback: {
          communication_score: 8,
          confidence_score: 7,
          technical_score: 9,
          answer_structure_score: 8,
          professional_presentation_score: 8,
          overall_score: 82,
          feedback: "Solid.",
          recommendations: [],
          created_at: "x",
        },
      },
    ]);

    render(await CandidateDashboardPage());

    expect(screen.getByText("Last interview: Score 82")).toBeInTheDocument();
  });

  it("shows the Resume module with real state instead of a placeholder", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerResumes.mockResolvedValue([
      {
        id: "r1",
        version: 1,
        original_filename: "resume.pdf",
        content_type: "application/pdf",
        file_size: 100,
        status: "UNDER_REVIEW",
        uploaded_at: "2026-09-10T00:00:00Z",
        is_latest: true,
      },
    ]);

    render(await CandidateDashboardPage());

    const resumeLinks = screen.getAllByRole("link", { name: /resume/i });
    const resumeCard = resumeLinks.find((link) => link.getAttribute("href") === "/app/resume");
    expect(resumeCard).toBeDefined();
    expect(screen.getByText("Review in progress")).toBeInTheDocument();
  });

  it("shows an honest empty state for the Resume module when none has been uploaded", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerResumes.mockResolvedValue([]);

    render(await CandidateDashboardPage());

    expect(screen.getByText("Not uploaded yet")).toBeInTheDocument();
  });

  it("shows an honest empty state for the LinkedIn module when no URL has been added", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerLinkedInProfile.mockResolvedValue(null);

    render(await CandidateDashboardPage());

    expect(screen.getByText("Not added")).toBeInTheDocument();
  });

  it("shows the LinkedIn module with real review-in-progress state", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerLinkedInProfile.mockResolvedValue({
      id: "li1",
      profile_url: "https://linkedin.com/in/example",
      created_at: "x",
      updated_at: "x",
    });
    getServerLinkedInReview.mockResolvedValue({
      id: "r1",
      status: "REQUESTED",
      profile_url_snapshot: "https://linkedin.com/in/example",
      requested_at: "x",
      started_at: null,
      completed_at: null,
      result: null,
    });

    render(await CandidateDashboardPage());

    const linkedInLinks = screen.getAllByRole("link", { name: /linkedin/i });
    const linkedInCard = linkedInLinks.find((link) => link.getAttribute("href") === "/app/linkedin");
    expect(linkedInCard).toBeDefined();
    expect(screen.getByText("Review in progress")).toBeInTheDocument();
  });

  it("shows the LinkedIn module as 'Added' when a URL exists but no review was requested", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);
    getServerLinkedInProfile.mockResolvedValue({
      id: "li1",
      profile_url: "https://linkedin.com/in/example",
      created_at: "x",
      updated_at: "x",
    });

    render(await CandidateDashboardPage());

    expect(screen.getByText("Added")).toBeInTheDocument();
  });

  it("lays out cards with a reflowing grid rather than a fixed desktop width", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerDashboard.mockResolvedValue(SAMPLE_DASHBOARD);

    const { container } = render(await CandidateDashboardPage());

    const grids = container.querySelectorAll('[style*="auto-fit"]');
    expect(grids.length).toBeGreaterThan(0);
  });
});
