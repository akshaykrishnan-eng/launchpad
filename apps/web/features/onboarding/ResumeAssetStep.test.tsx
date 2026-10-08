import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push, listResumes, getReview, requestReview, getCredits } = vi.hoisted(() => ({
  push: vi.fn(),
  listResumes: vi.fn(),
  getReview: vi.fn(),
  requestReview: vi.fn(),
  getCredits: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/resume/client", () => ({ listResumes, getReview, requestReview }));
vi.mock("@/lib/credits/client", () => ({ getCredits }));

import { ResumeAssetStep } from "./ResumeAssetStep";

describe("ResumeAssetStep", () => {
  afterEach(() => {
    push.mockClear();
    listResumes.mockClear();
    getReview.mockClear();
    requestReview.mockClear();
    getCredits.mockClear();
  });

  it("shows the upload prompt and a skip action when no resume exists", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [] });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<ResumeAssetStep />);

    expect(await screen.findByText("Add your resume")).toBeInTheDocument();
    expect(screen.getByLabelText(/upload resume/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i'll do this later/i })).toBeInTheDocument();
  });

  it("skipping navigates to the LinkedIn step without uploading", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [] });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<ResumeAssetStep />);
    await screen.findByText("Add your resume");

    fireEvent.click(screen.getByRole("button", { name: /i'll do this later/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/linkedin");
  });

  it("shows the success state and a review CTA when a resume already exists, without re-uploading", async () => {
    listResumes.mockResolvedValue({
      ok: true,
      data: [{ id: "r1", version: 1, original_filename: "resume.pdf", is_latest: true }],
    });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [{ credit_type: "RESUME_REVIEW", balance: 2 }] });

    render(<ResumeAssetStep />);

    expect(await screen.findByText("Resume added")).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload resume/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request resume review/i })).toBeInTheDocument();
  });

  it("requesting a review calls the existing review flow and deducts no credit client-side", async () => {
    listResumes.mockResolvedValue({
      ok: true,
      data: [{ id: "r1", version: 1, original_filename: "resume.pdf", is_latest: true }],
    });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: [{ credit_type: "RESUME_REVIEW", balance: 2 }] });
    requestReview.mockResolvedValue({ ok: true, data: { id: "rev1", status: "REQUESTED" } });

    render(<ResumeAssetStep />);
    await screen.findByText("Resume added");

    fireEvent.click(screen.getByRole("button", { name: /request resume review/i }));

    await waitFor(() => expect(requestReview).toHaveBeenCalledWith("r1"));
    expect(await screen.findByText(/resume review requested/i)).toBeInTheDocument();
  });

  it("continuing always navigates to the LinkedIn step", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [] });
    getCredits.mockResolvedValue({ ok: true, data: [] });

    render(<ResumeAssetStep />);
    await screen.findByText("Add your resume");

    fireEvent.click(screen.getByRole("button", { name: /^continue/i }));

    expect(push).toHaveBeenCalledWith("/onboarding/linkedin");
  });
});
