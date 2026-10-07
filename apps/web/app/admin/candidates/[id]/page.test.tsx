import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, notFound, getAccessToken, getServerCandidate360 } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getAccessToken: vi.fn(),
  getServerCandidate360: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect,
  notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerCandidate360 }));

import Candidate360Page from "./page";

const FULL_CANDIDATE = {
  candidate: {
    id: "c1",
    user_id: "u1",
    email: "dana@example.com",
    is_active: true,
    created_at: "2026-09-01T00:00:00Z",
    last_login_at: "2026-10-01T00:00:00Z",
  },
  profile: {
    id: "c1",
    user_id: "u1",
    first_name: "Dana",
    last_name: "Lee",
    mobile_number: "555-0100",
    current_city: "Austin",
    current_status: "Actively looking",
    degree: "B.S.",
    specialisation: "Computer Science",
    graduation_year: 2024,
    career_goal: "Backend engineering",
    completion_percentage: 90,
  },
  education: [
    { id: "e1", institution: "UT Austin", degree: "B.S.", specialization: "CS", start_year: 2020, graduation_year: 2024, education_status: "COMPLETED" },
  ],
  skills: [{ id: "s1", name: "Python" }],
  experience: [
    { id: "w1", company: "Acme", job_title: "Intern", location: "Remote", start_date: "2023-06-01", end_date: null, is_current: true, description: null },
  ],
  career_preferences: { preferred_roles: ["Backend Engineer"], preferred_locations: ["Remote"] },
  resume: {
    id: "res1",
    version: 1,
    original_filename: "resume.pdf",
    content_type: "application/pdf",
    file_size: 1024,
    status: "UNDER_REVIEW",
    uploaded_at: "2026-09-15T00:00:00Z",
    is_latest: true,
  },
  resume_review: {
    id: "r1",
    resume_id: "res1",
    status: "IN_REVIEW",
    requested_at: "2026-09-16T00:00:00Z",
    started_at: "2026-09-17T00:00:00Z",
    completed_at: null,
    result: null,
  },
  linkedin: { id: "li1", profile_url: "https://linkedin.com/in/dana", created_at: "x", updated_at: "x" },
  linkedin_review: {
    id: "lr1",
    status: "COMPLETED",
    profile_url_snapshot: "https://linkedin.com/in/dana",
    requested_at: "x",
    started_at: "x",
    completed_at: "x",
    result: { score: 88, summary: "Strong profile.", strengths: [], improvements: [], recommendations: [], reviewer_type: "HUMAN", created_at: "x" },
  },
  interviews: [
    { id: "mi1", interview_type: "HR", role: null, status: "BOOKED", scheduled_at: "2026-11-01T10:00:00Z", created_at: "x", feedback: null },
  ],
  credits: [
    { credit_type: "MOCK_INTERVIEW", balance: 2 },
    { credit_type: "CAREER_COACHING", balance: 0 },
    { credit_type: "RESUME_REVIEW", balance: 0 },
    { credit_type: "LINKEDIN_REVIEW", balance: 0 },
  ],
};

afterEach(() => {
  redirect.mockClear();
  notFound.mockClear();
  getAccessToken.mockClear();
  getServerCandidate360.mockReset();
});

describe("Candidate360Page", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(Candidate360Page({ params: Promise.resolve({ id: "c1" }) })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("calls notFound for a candidate id that doesn't exist", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidate360.mockResolvedValue(null);

    await expect(Candidate360Page({ params: Promise.resolve({ id: "ghost" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the full aggregate profile with no field left out", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidate360.mockResolvedValue(FULL_CANDIDATE);

    render(await Candidate360Page({ params: Promise.resolve({ id: "c1" }) }));

    expect(screen.getByRole("heading", { name: "Dana Lee" })).toBeInTheDocument();
    expect(screen.getByText(/dana@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Profile completion: 90%/)).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText(/UT Austin/)).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
    expect(screen.getByText(/Backend Engineer/)).toBeInTheDocument();
    expect(screen.getByText("resume.pdf")).toBeInTheDocument();
    expect(screen.getByText("linkedin.com/in/dana")).toBeInTheDocument();
    expect(screen.getByText("Strong profile.")).toBeInTheDocument();
    expect(screen.getByText("HR Interview")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const grantLink = screen.getByRole("link", { name: "Grant Credits" });
    expect(grantLink).toHaveAttribute("href", "/admin/credits?candidate_id=c1");
  });

  it("never renders raw auth secrets anywhere in the page", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidate360.mockResolvedValue(FULL_CANDIDATE);

    const { container } = render(await Candidate360Page({ params: Promise.resolve({ id: "c1" }) }));
    const html = container.innerHTML.toLowerCase();

    expect(html).not.toContain("password");
    expect(html).not.toContain("refresh_token");
    expect(html).not.toContain("access_token");
  });

  it("shows gentle placeholders for an incomplete profile instead of blank space", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidate360.mockResolvedValue({
      ...FULL_CANDIDATE,
      education: [],
      skills: [],
      experience: [],
      career_preferences: { preferred_roles: [], preferred_locations: [] },
      resume: null,
      resume_review: null,
      linkedin: null,
      linkedin_review: null,
      interviews: [],
    });

    render(await Candidate360Page({ params: Promise.resolve({ id: "c1" }) }));

    expect(screen.getAllByText("Not completed yet.").length).toBeGreaterThan(0);
    expect(screen.getByText("No resume uploaded yet.")).toBeInTheDocument();
    expect(screen.getByText("No LinkedIn profile added yet.")).toBeInTheDocument();
    expect(screen.getByText("No mock interviews booked yet.")).toBeInTheDocument();
  });
});
