import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getLinkedInProfile, getLinkedInReview, requestLinkedInReview, saveLinkedInUrl } =
  vi.hoisted(() => ({
    getLinkedInProfile: vi.fn(),
    getLinkedInReview: vi.fn(),
    requestLinkedInReview: vi.fn(),
    saveLinkedInUrl: vi.fn(),
  }));
vi.mock("@/lib/linkedin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/linkedin/client")>(
    "@/lib/linkedin/client",
  );
  return { ...actual, getLinkedInProfile, getLinkedInReview, requestLinkedInReview, saveLinkedInUrl };
});

import { LinkedInCentre } from "./LinkedInCentre";

const PROFILE = {
  id: "p1",
  profile_url: "https://linkedin.com/in/example",
  created_at: "x",
  updated_at: "x",
};

afterEach(() => {
  getLinkedInProfile.mockReset();
  getLinkedInReview.mockReset();
  requestLinkedInReview.mockReset();
  saveLinkedInUrl.mockReset();
});

describe("LinkedInCentre", () => {
  it("shows a loading state before data arrives", () => {
    getLinkedInProfile.mockReturnValue(new Promise(() => {}));

    render(<LinkedInCentre />);

    expect(screen.getByText(/loading your linkedin centre/i)).toBeInTheDocument();
  });

  it("shows the empty state and a save form when no profile exists", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: null });

    render(<LinkedInCentre />);

    expect(await screen.findByText(/add your linkedin profile url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin profile url/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getLinkedInProfile.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    render(<LinkedInCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getLinkedInProfile.mockResolvedValueOnce({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValue({ ok: true, data: null });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("linkedin.com/in/example")).toBeInTheDocument();
  });

  it("renders the current URL when a profile exists", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValue({ ok: true, data: null });

    render(<LinkedInCentre />);

    expect(await screen.findByText("linkedin.com/in/example")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request review/i })).toBeInTheDocument();
  });

  it("switches to edit mode, allowing cancel back to the saved URL", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValue({ ok: true, data: null });

    render(<LinkedInCentre />);
    await screen.findByText("linkedin.com/in/example");

    fireEvent.click(screen.getByRole("button", { name: /edit url/i }));
    expect(screen.getByLabelText(/linkedin profile url/i)).toHaveValue(PROFILE.profile_url);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(await screen.findByText("linkedin.com/in/example")).toBeInTheDocument();
  });

  it("requests a review and shows the under-review state", async () => {
    getLinkedInProfile.mockResolvedValueOnce({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValueOnce({ ok: true, data: null });
    render(<LinkedInCentre />);
    await screen.findByText("linkedin.com/in/example");

    requestLinkedInReview.mockResolvedValue({
      ok: true,
      data: {
        id: "r1",
        status: "REQUESTED",
        profile_url_snapshot: PROFILE.profile_url,
        requested_at: "x",
        started_at: null,
        completed_at: null,
        result: null,
      },
    });
    getLinkedInProfile.mockResolvedValueOnce({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "r1",
        status: "REQUESTED",
        profile_url_snapshot: PROFILE.profile_url,
        requested_at: "x",
        started_at: null,
        completed_at: null,
        result: null,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /request review/i }));

    expect(await screen.findByText("Status: Under review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request review/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit url/i })).toBeDisabled();
  });

  it("renders completed review feedback only when a result actually exists", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: PROFILE });
    getLinkedInReview.mockResolvedValue({
      ok: true,
      data: {
        id: "r1",
        status: "COMPLETED",
        profile_url_snapshot: PROFILE.profile_url,
        requested_at: "x",
        started_at: "x",
        completed_at: "x",
        result: {
          score: 76,
          summary: "Clear headline.",
          strengths: ["Strong headline"],
          improvements: ["Add more detail"],
          recommendations: ["Request recommendations"],
          reviewer_type: "HUMAN",
          created_at: "x",
        },
      },
    });

    render(<LinkedInCentre />);

    expect(await screen.findByText("Status: Review completed")).toBeInTheDocument();
    // Feedback is collapsed by default, same as Resume Centre.
    expect(screen.queryByText("Clear headline.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));

    expect(screen.getByText("76")).toBeInTheDocument();
    expect(screen.getByText("Clear headline.")).toBeInTheDocument();
    expect(screen.getByText("Strong headline")).toBeInTheDocument();
    expect(screen.getByText("Add more detail")).toBeInTheDocument();
    expect(screen.getByText("Request recommendations")).toBeInTheDocument();
    // Can request a new review and can edit the URL again now.
    expect(screen.getByRole("button", { name: /request review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit url/i })).not.toBeDisabled();
  });
});
