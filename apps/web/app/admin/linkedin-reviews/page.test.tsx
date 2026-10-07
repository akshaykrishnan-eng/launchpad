import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect, getAccessToken, getServerLinkedInReviews } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  getAccessToken: vi.fn(),
  getServerLinkedInReviews: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getAccessToken }));
vi.mock("@/lib/admin/backend", () => ({ getServerLinkedInReviews }));

import AdminLinkedInReviewsPage from "./page";

afterEach(() => {
  redirect.mockClear();
  getAccessToken.mockClear();
  getServerLinkedInReviews.mockReset();
});

describe("AdminLinkedInReviewsPage", () => {
  it("redirects to /login when there is no access token", async () => {
    getAccessToken.mockResolvedValue(undefined);

    await expect(AdminLinkedInReviewsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
  });

  it("shows the empty queue message when there are no pending reviews", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerLinkedInReviews.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });

    render(await AdminLinkedInReviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No pending LinkedIn reviews")).toBeInTheDocument();
  });

  it("passes the status filter through to the backend call and renders queue rows", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerLinkedInReviews.mockResolvedValue({
      items: [
        {
          review: {
            id: "lr1",
            status: "COMPLETED",
            profile_url_snapshot: "https://linkedin.com/in/dana",
            requested_at: "2026-10-01T00:00:00Z",
            started_at: "x",
            completed_at: "x",
            result: null,
          },
          candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });

    render(await AdminLinkedInReviewsPage({ searchParams: Promise.resolve({ status: "COMPLETED" }) }));

    expect(getServerLinkedInReviews).toHaveBeenCalledWith("token", { page: 1, page_size: 20, status: "COMPLETED" });
    expect(screen.getByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/admin/linkedin-reviews/lr1");
  });

  it("shows an error state when the queue fails to load", async () => {
    getAccessToken.mockResolvedValue("token");
    getServerLinkedInReviews.mockResolvedValue(null);

    render(await AdminLinkedInReviewsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
