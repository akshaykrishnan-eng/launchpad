import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, getLinkedInProfile, getLinkedInReview, requestLinkedInReview, saveLinkedInUrl, getCredits } =
  vi.hoisted(() => ({
    push: vi.fn(),
    getLinkedInProfile: vi.fn(),
    getLinkedInReview: vi.fn(),
    requestLinkedInReview: vi.fn(),
    saveLinkedInUrl: vi.fn(),
    getCredits: vi.fn(),
  }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/linkedin/client", () => ({
  getLinkedInProfile,
  getLinkedInReview,
  requestLinkedInReview,
  saveLinkedInUrl,
}));
vi.mock("@/lib/credits/client", () => ({ getCredits }));

import { LinkedInAssetStep } from "./LinkedInAssetStep";

describe("LinkedInAssetStep", () => {
  afterEach(() => {
    push.mockClear();
    getLinkedInProfile.mockClear();
    getLinkedInReview.mockClear();
    requestLinkedInReview.mockClear();
    saveLinkedInUrl.mockClear();
    getCredits.mockClear();
  });

  it("shows the URL form and a skip action when no profile exists", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<LinkedInAssetStep />);

    expect(await screen.findByText("Add your LinkedIn profile")).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin profile url/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i'll do this later/i })).toBeInTheDocument();
  });

  it("skipping navigates back to the onboarding hub without saving", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<LinkedInAssetStep />);
    await screen.findByText("Add your LinkedIn profile");

    fireEvent.click(screen.getByRole("button", { name: /i'll do this later/i }));

    expect(push).toHaveBeenCalledWith("/onboarding");
    expect(saveLinkedInUrl).not.toHaveBeenCalled();
  });

  it("shows the success state and a review CTA when a profile already exists", async () => {
    getLinkedInProfile.mockResolvedValue({
      ok: true,
      data: { id: "l1", profile_url: "https://linkedin.com/in/x", created_at: "", updated_at: "" },
    });
    getLinkedInReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [{ credit_type: "LINKEDIN_REVIEW", balance: 2 }] });

    render(<LinkedInAssetStep />);

    expect(await screen.findByText("LinkedIn added")).toBeInTheDocument();
    expect(screen.queryByLabelText(/linkedin profile url/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request linkedin review/i })).toBeInTheDocument();
  });

  it("requesting a review calls the existing review flow and deducts no credit client-side", async () => {
    getLinkedInProfile.mockResolvedValue({
      ok: true,
      data: { id: "l1", profile_url: "https://linkedin.com/in/x", created_at: "", updated_at: "" },
    });
    getLinkedInReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [{ credit_type: "LINKEDIN_REVIEW", balance: 2 }] });
    requestLinkedInReview.mockResolvedValue({ ok: true, data: { id: "rev1", status: "REQUESTED" } });

    render(<LinkedInAssetStep />);
    await screen.findByText("LinkedIn added");

    fireEvent.click(screen.getByRole("button", { name: /request linkedin review/i }));

    await waitFor(() => expect(requestLinkedInReview).toHaveBeenCalled());
    expect(await screen.findByText(/linkedin review requested/i)).toBeInTheDocument();
  });

  it("continuing after saving a profile navigates to the onboarding hub", async () => {
    getLinkedInProfile.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<LinkedInAssetStep />);
    await screen.findByText("Add your LinkedIn profile");

    fireEvent.click(screen.getByRole("button", { name: /^continue/i }));

    expect(push).toHaveBeenCalledWith("/onboarding");
  });
});
