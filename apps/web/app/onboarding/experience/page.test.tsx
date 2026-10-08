import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerExperience } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerExperience: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/candidate/backend", () => ({ getServerExperience }));

import ExperiencePage from "./page";

describe("ExperiencePage", () => {
  it("redirects to /login when unauthenticated", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(ExperiencePage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the step with the candidate's existing experience", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerExperience.mockResolvedValue([
      {
        id: "e1",
        company: "Acme",
        job_title: "Engineer",
        location: null,
        start_date: "2020-01-01",
        end_date: null,
        is_current: true,
        description: null,
      },
    ]);

    render(await ExperiencePage());

    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the empty state when the backend call fails", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerExperience.mockResolvedValue(null);

    render(await ExperiencePage());

    expect(screen.getByText("No experience added yet")).toBeInTheDocument();
  });
});
