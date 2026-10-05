import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { listResumes, getReview, requestReview, uploadResume } = vi.hoisted(() => ({
  listResumes: vi.fn(),
  getReview: vi.fn(),
  requestReview: vi.fn(),
  uploadResume: vi.fn(),
}));
vi.mock("@/lib/resume/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/resume/client")>(
    "@/lib/resume/client",
  );
  return { ...actual, listResumes, getReview, requestReview, uploadResume };
});

import { ResumeCentre } from "./ResumeCentre";

const RESUME_V1 = {
  id: "r1",
  version: 1,
  original_filename: "resume_v1.pdf",
  content_type: "application/pdf",
  file_size: 1234,
  status: "UPLOADED" as const,
  uploaded_at: "2026-09-10T00:00:00Z",
  is_latest: true,
};

afterEach(() => {
  listResumes.mockReset();
  getReview.mockReset();
  requestReview.mockReset();
  uploadResume.mockReset();
});

describe("ResumeCentre", () => {
  it("shows a loading state before data arrives", () => {
    listResumes.mockReturnValue(new Promise(() => {}));

    render(<ResumeCentre />);

    expect(screen.getByText(/loading your resume centre/i)).toBeInTheDocument();
  });

  it("shows the empty state when no resume has been uploaded", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [] });

    render(<ResumeCentre />);

    expect(await screen.findByText(/no resume uploaded yet/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry when loading fails", async () => {
    listResumes.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    render(<ResumeCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("resume_v1.pdf")).toBeInTheDocument();
  });

  it("renders the current resume with version, filename, and status", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });

    render(<ResumeCentre />);

    expect(await screen.findByText("resume_v1.pdf")).toBeInTheDocument();
    expect(screen.getByText(/version 1/i)).toBeInTheDocument();
    expect(screen.getByText("Status: Uploaded")).toBeInTheDocument();
  });

  it("does not show version history for a single resume", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });

    render(<ResumeCentre />);
    await screen.findByText("resume_v1.pdf");

    expect(screen.queryByText(/resume history/i)).not.toBeInTheDocument();
  });

  it("shows version history with the latest version identifiable when multiple exist", async () => {
    const v2 = { ...RESUME_V1, id: "r2", version: 2, original_filename: "resume_v2.pdf" };
    const v1 = { ...RESUME_V1, is_latest: false };
    listResumes.mockResolvedValue({ ok: true, data: [v2, v1] });
    getReview.mockResolvedValue({ ok: true, data: null });

    render(<ResumeCentre />);

    expect(await screen.findByText(/resume history/i)).toBeInTheDocument();
    expect(screen.getByText(/v2 \(latest\)/)).toBeInTheDocument();
    expect(screen.getByText(/v1 —/)).toBeInTheDocument();
  });

  it("requests a review and reflects the under-review state", async () => {
    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });
    render(<ResumeCentre />);
    await screen.findByText("resume_v1.pdf");

    requestReview.mockResolvedValue({
      ok: true,
      data: { id: "rr1", resume_id: "r1", status: "REQUESTED", requested_at: "x", started_at: null, completed_at: null, result: null },
    });
    listResumes.mockResolvedValueOnce({
      ok: true,
      data: [{ ...RESUME_V1, status: "UNDER_REVIEW" }],
    });
    getReview.mockResolvedValueOnce({
      ok: true,
      data: { id: "rr1", resume_id: "r1", status: "REQUESTED", requested_at: "x", started_at: null, completed_at: null, result: null },
    });

    fireEvent.click(screen.getByRole("button", { name: /request review/i }));

    expect(await screen.findByText("Status: Under review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request review/i })).not.toBeInTheDocument();
  });

  it("renders completed review feedback only when a result actually exists", async () => {
    const completedResume = { ...RESUME_V1, status: "COMPLETED" as const };
    listResumes.mockResolvedValue({ ok: true, data: [completedResume] });
    getReview.mockResolvedValue({
      ok: true,
      data: {
        id: "rr1",
        resume_id: "r1",
        status: "COMPLETED",
        requested_at: "x",
        started_at: "x",
        completed_at: "x",
        result: {
          score: 82,
          summary: "Solid resume.",
          strengths: ["Clear formatting"],
          improvements: ["Add a summary"],
          recommendations: ["Tailor keywords"],
          reviewer_type: "HUMAN",
          created_at: "x",
        },
      },
    });

    render(<ResumeCentre />);
    await screen.findByText("Status: Review completed");

    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));

    expect(screen.getByText(/score:/i)).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Solid resume.")).toBeInTheDocument();
    expect(screen.getByText("Clear formatting")).toBeInTheDocument();
    expect(screen.getByText("Add a summary")).toBeInTheDocument();
    expect(screen.getByText("Tailor keywords")).toBeInTheDocument();
  });

  it("provides a download link pointing at the resume download endpoint", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });

    render(<ResumeCentre />);

    const link = await screen.findByRole("link", { name: /view \/ download/i });
    expect(link).toHaveAttribute("href", "/api/candidate/resumes/r1/download");
  });
});
