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
vi.mock("@/lib/resume/client", () => ({
  listResumes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  getReview: vi.fn().mockResolvedValue({ ok: true, data: null }),
  requestReview: vi.fn(),
  uploadResume: vi.fn(),
  downloadUrl: (id: string) => `/api/candidate/resumes/${id}/download`,
}));

import ResumeCentrePage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
});

describe("ResumeCentrePage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(ResumeCentrePage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders the Resume Centre heading when authenticated", async () => {
    getAccessToken.mockResolvedValue("token");

    render(await ResumeCentrePage());

    expect(screen.getByRole("heading", { name: /resume centre/i })).toBeInTheDocument();
    expect(await screen.findByText(/no resume uploaded yet/i)).toBeInTheDocument();
  });
});
