import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const {
  redirect,
  getAccessToken,
  getServerCandidateProfile,
  getServerEducation,
  getServerSkills,
  getServerExperience,
  getServerPreferences,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerCandidateProfile: vi.fn(),
  getServerEducation: vi.fn(),
  getServerSkills: vi.fn(),
  getServerExperience: vi.fn(),
  getServerPreferences: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({
  getServerCandidateProfile,
  getServerEducation,
  getServerSkills,
  getServerExperience,
  getServerPreferences,
}));

import CandidateProfilePage from "./page";

const EMPTY_PROFILE = {
  id: "1",
  user_id: "1",
  first_name: null,
  last_name: null,
  mobile_number: null,
  current_city: null,
  current_status: null,
  degree: null,
  specialisation: null,
  graduation_year: null,
  career_goal: null,
  completion_percentage: 0,
};

function mockEmptyData() {
  getAccessToken.mockResolvedValue("token");
  getServerCandidateProfile.mockResolvedValue(EMPTY_PROFILE);
  getServerEducation.mockResolvedValue([]);
  getServerSkills.mockResolvedValue([]);
  getServerExperience.mockResolvedValue([]);
  getServerPreferences.mockResolvedValue({ preferred_roles: [], preferred_locations: [] });
}

describe("CandidateProfilePage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(CandidateProfilePage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows empty-state messaging for an incomplete profile", async () => {
    mockEmptyData();

    render(await CandidateProfilePage());

    expect(screen.getByText("0% complete")).toBeInTheDocument();
    expect(screen.getAllByText("Not completed yet.").length).toBeGreaterThan(0);
  });

  it("renders filled-in profile data", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerCandidateProfile.mockResolvedValue({
      ...EMPTY_PROFILE,
      first_name: "Dana",
      last_name: "Smith",
      career_goal: "Become a backend engineer",
      completion_percentage: 55,
    });
    getServerEducation.mockResolvedValue([
      {
        id: "edu-1",
        institution: "State University",
        degree: "BSc",
        specialization: "CS",
        start_year: 2020,
        graduation_year: 2024,
        education_status: null,
      },
    ]);
    getServerSkills.mockResolvedValue([{ id: "s1", name: "Python" }]);
    getServerExperience.mockResolvedValue([]);
    getServerPreferences.mockResolvedValue({ preferred_roles: [], preferred_locations: [] });

    render(await CandidateProfilePage());

    expect(screen.getByText("55% complete")).toBeInTheDocument();
    expect(screen.getByText(/Dana Smith/)).toBeInTheDocument();
    expect(screen.getByText(/State University/)).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Become a backend engineer")).toBeInTheDocument();
  });

  it("provides an add-experience form", async () => {
    mockEmptyData();

    render(await CandidateProfilePage());

    expect(screen.getByRole("button", { name: /add experience/i })).toBeInTheDocument();
  });
});
