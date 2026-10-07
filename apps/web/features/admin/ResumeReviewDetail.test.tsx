import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getResumeReview, startResumeReview, completeResumeReview } = vi.hoisted(() => ({
  getResumeReview: vi.fn(),
  startResumeReview: vi.fn(),
  completeResumeReview: vi.fn(),
}));
vi.mock("@/lib/admin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/client")>("@/lib/admin/client");
  return { ...actual, getResumeReview, startResumeReview, completeResumeReview };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ResumeReviewDetail } from "./ResumeReviewDetail";

const REQUESTED_ITEM = {
  review: { id: "r1", resume_id: "res1", status: "REQUESTED", requested_at: "2026-10-01T00:00:00Z", started_at: null, completed_at: null, result: null },
  candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
  resume_version: 1,
  resume_filename: "resume.pdf",
};

afterEach(() => {
  getResumeReview.mockReset();
  startResumeReview.mockReset();
  completeResumeReview.mockReset();
});

describe("ResumeReviewDetail", () => {
  it("shows a loading state before data arrives", () => {
    getResumeReview.mockReturnValue(new Promise(() => {}));

    render(<ResumeReviewDetail reviewId="r1" />);

    expect(screen.getByText(/loading review/i)).toBeInTheDocument();
  });

  it("shows an error state when the review fails to load", async () => {
    getResumeReview.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    render(<ResumeReviewDetail reviewId="r1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");
  });

  it("lets the admin start a REQUESTED review, then complete it", async () => {
    getResumeReview.mockResolvedValue({ ok: true, data: REQUESTED_ITEM });
    startResumeReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM.review, status: "IN_REVIEW" } });

    render(<ResumeReviewDetail reviewId="r1" />);

    expect(await screen.findByText("Dana Lee")).toBeInTheDocument();
    const startButton = screen.getByRole("button", { name: /start review/i });

    getResumeReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM, review: { ...REQUESTED_ITEM.review, status: "IN_REVIEW" } } });
    fireEvent.click(startButton);

    await waitFor(() => expect(startResumeReview).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /start review/i })).not.toBeInTheDocument());

    completeResumeReview.mockResolvedValue({ ok: true, data: { ...REQUESTED_ITEM.review, status: "COMPLETED" } });
    getResumeReview.mockResolvedValue({
      ok: true,
      data: {
        ...REQUESTED_ITEM,
        review: {
          ...REQUESTED_ITEM.review,
          status: "COMPLETED",
          result: { score: 85, summary: "Solid resume.", strengths: ["Clear"], improvements: [], recommendations: [], reviewer_type: "HUMAN", created_at: "x" },
        },
      },
    });

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Solid resume." } });
    fireEvent.click(screen.getByRole("button", { name: /complete review/i }));

    await waitFor(() => expect(completeResumeReview).toHaveBeenCalled());
    expect(await screen.findByText("Solid resume.")).toBeInTheDocument();
    expect(completeResumeReview).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ summary: "Solid resume.", score: null }),
    );
  });

  it("rejects an empty summary client-side without calling the API", async () => {
    getResumeReview.mockResolvedValue({ ok: true, data: REQUESTED_ITEM });

    render(<ResumeReviewDetail reviewId="r1" />);
    await screen.findByText("Dana Lee");

    fireEvent.click(screen.getByRole("button", { name: /complete review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a summary/i);
    expect(completeResumeReview).not.toHaveBeenCalled();
  });

  it("shows a server-side completion error without losing the form", async () => {
    getResumeReview.mockResolvedValue({ ok: true, data: REQUESTED_ITEM });
    completeResumeReview.mockResolvedValue({ ok: false, status: 409, error: "Review is already completed." });

    render(<ResumeReviewDetail reviewId="r1" />);
    await screen.findByText("Dana Lee");

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Looks good." } });
    fireEvent.click(screen.getByRole("button", { name: /complete review/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already completed");
  });
});
