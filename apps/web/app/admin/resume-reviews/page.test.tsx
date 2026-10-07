import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerResumeReviews } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerResumeReviews: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerResumeReviews }));

import AdminResumeReviewsPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerResumeReviews.mockReset();
});

describe("AdminResumeReviewsPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminResumeReviewsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });

  it("shows the empty queue message when there are no pending reviews", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerResumeReviews.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    render(await AdminResumeReviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No pending resume reviews")).toBeInTheDocument();
  });

  it("passes the status filter through to the backend call and renders queue rows", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerResumeReviews.mockResolvedValue({
      items: [
        {
          review: { id: "r1", resume_id: "res1", status: "REQUESTED", requested_at: "2026-10-01T00:00:00Z", started_at: null, completed_at: null, result: null },
          candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
          resume_version: 1,
          resume_filename: "resume.pdf",
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });

    render(await AdminResumeReviewsPage({ searchParams: Promise.resolve({ status: "REQUESTED" }) }));

    expect(getServerResumeReviews).toHaveBeenCalledWith("token", { page: 1, page_size: 20, status: "REQUESTED" });
    expect(screen.getByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/admin/resume-reviews/r1");
  });

  it("shows an error state when the queue fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerResumeReviews.mockResolvedValue(null);

    render(await AdminResumeReviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
