import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getLinkedInReview, startLinkedInReview, completeLinkedInReview } = vi.hoisted(() => ({
  getLinkedInReview: vi.fn(),
  startLinkedInReview: vi.fn(),
  completeLinkedInReview: vi.fn(),
}));
vi.mock("@/lib/admin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/client")>("@/lib/admin/client");
  return { ...actual, getLinkedInReview, startLinkedInReview, completeLinkedInReview };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { LinkedInReviewDetail } from "./LinkedInReviewDetail";

const REQUESTED_ITEM = {
  review: {
    id: "lr1",
    status: "REQUESTED",
    profile_url_snapshot: "https://linkedin.com/in/dana",
    requested_at: "2026-10-01T00:00:00Z",
    started_at: null,
    completed_at: null,
    result: null,
  },
  candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
};

afterEach(() => {
  getLinkedInReview.mockReset();
  startLinkedInReview.mockReset();
  completeLinkedInReview.mockReset();
});

describe("LinkedInReviewDetail", () => {
  it("shows an error state when the review fails to load", async () => {
    getLinkedInReview.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    render(<LinkedInReviewDetail reviewId="lr1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");
  });

  it("starts, then completes, a LinkedIn review", async () => {
    getLinkedInReview.mockResolvedValue({ ok: true, data: REQUESTED_ITEM });
    startLinkedInReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM.review, status: "IN_REVIEW" } });

    render(<LinkedInReviewDetail reviewId="lr1" />);

    expect(await screen.findByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByText("linkedin.com/in/dana")).toBeInTheDocument();

    getLinkedInReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM, review: { ...REQUESTED_ITEM.review, status: "IN_REVIEW" } } });
    fireEvent.click(screen.getByRole("button", { name: /start review/i }));
    await waitFor(() => expect(startLinkedInReview).toHaveBeenCalledWith("lr1"));

    completeLinkedInReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM.review, status: "COMPLETED" } });
    getLinkedInReview.mockResolvedValue({
      ok: true,
      data: {
        ...REQUESTED_ITEM,
        review: {
          ...REQUESTED_ITEM.review,
          status: "COMPLETED",
          result: { score: 90, summary: "Great headline.", strengths: [], improvements: [], recommendations: [], reviewer_type: "HUMAN", created_at: "x" },
        },
      },
    });

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Great headline." } });
    fireEvent.click(screen.getByRole("button", { name: /complete review/i }));

    await waitFor(() => expect(completeLinkedInReview).toHaveBeenCalled());
    expect(await screen.findByText("Great headline.")).toBeInTheDocument();
    expect(completeLinkedInReview).toHaveBeenCalledWith("lr1", expect.objectContaining({ summary: "Great headline." }));
  });

  it("rejects an out-of-range score client-side", async () => {
    getLinkedInReview.mockResolvedValue({ ok: true, data: REQUESTED_ITEM });

    render(<LinkedInReviewDetail reviewId="lr1" />);
    await screen.findByText("Dana Lee");

    fireEvent.change(screen.getByLabelText(/score/i), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: /complete review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/between 0 and 100/i);
    expect(completeLinkedInReview).not.toHaveBeenCalled();
  });
});
