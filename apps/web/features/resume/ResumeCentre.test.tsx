import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listResumes, getReview, requestReview, uploadResume, getCredits } = vi.hoisted(() => ({
  listResumes: vi.fn(),
  getReview: vi.fn(),
  requestReview: vi.fn(),
  uploadResume: vi.fn(),
  getCredits: vi.fn(),
}));
vi.mock("@/lib/resume/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/resume/client")>(
    "@/lib/resume/client",
  );
  return { ...actual, listResumes, getReview, requestReview, uploadResume };
});
vi.mock("@/lib/credits/client", () => ({ getCredits }));

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

const ZERO_BALANCES = [
  { credit_type: "MOCK_INTERVIEW", balance: 0 },
  { credit_type: "CAREER_COACHING", balance: 0 },
  { credit_type: "RESUME_REVIEW", balance: 0 },
  { credit_type: "LINKEDIN_REVIEW", balance: 0 },
];

const ONE_RESUME_REVIEW_CREDIT = [
  { credit_type: "MOCK_INTERVIEW", balance: 0 },
  { credit_type: "CAREER_COACHING", balance: 0 },
  { credit_type: "RESUME_REVIEW", balance: 1 },
  { credit_type: "LINKEDIN_REVIEW", balance: 0 },
];

afterEach(() => {
  listResumes.mockReset();
  getReview.mockReset();
  requestReview.mockReset();
  uploadResume.mockReset();
  getCredits.mockReset();
});

describe("ResumeCentre", () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;

    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });
  it("shows a loading state before data arrives", () => {
    listResumes.mockReturnValue(new Promise(() => {}));
    getCredits.mockReturnValue(new Promise(() => {}));

    render(<ResumeCentre />);

    expect(screen.getByText(/loading your resume centre/i)).toBeInTheDocument();
  });

  it("shows the empty state when no resume has been uploaded", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [] });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);

    expect(await screen.findByText(/no resume uploaded yet/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry when loading fails", async () => {
    listResumes.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    render(<ResumeCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect((await screen.findAllByText("resume_v1.pdf")).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the current resume with version, filename, and status", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);

    // Shown once in the hero summary and once in the current-resume card.
    expect((await screen.findAllByText("resume_v1.pdf")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/version 1/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Status: Uploaded")).toBeInTheDocument();
  });

  it("does not show version history for a single resume", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    expect(screen.queryByText(/resume history/i)).not.toBeInTheDocument();
  });

  it("shows version history with the latest version identifiable when multiple exist", async () => {
    const v2 = { ...RESUME_V1, id: "r2", version: 2, original_filename: "resume_v2.pdf" };
    const v1 = { ...RESUME_V1, is_latest: false };
    listResumes.mockResolvedValue({ ok: true, data: [v2, v1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);

    expect(await screen.findByText(/resume history/i)).toBeInTheDocument();
    expect(screen.getByText(/v2 \(latest\)/)).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("resume_v1.pdf")).toBeInTheDocument();
    // Nothing more to view with only 2 versions.
    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("shows only the 3 most recent versions with a View all link when more exist", async () => {
    const versions = [4, 3, 2, 1, 0].map((n) => ({
      ...RESUME_V1,
      id: `r${n}`,
      version: n + 1,
      original_filename: `resume_v${n + 1}.pdf`,
      is_latest: n === 4,
    }));
    listResumes.mockResolvedValue({ ok: true, data: versions });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);

    expect(await screen.findByText(/resume history/i)).toBeInTheDocument();
    // v5 is also the current resume, shown separately above -- the
    // preview list itself should contain exactly v5, v4, v3.
    expect(screen.getAllByText("resume_v5.pdf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("resume_v4.pdf")).toBeInTheDocument();
    expect(screen.getByText("resume_v3.pdf")).toBeInTheDocument();
    expect(screen.queryByText("resume_v2.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("resume_v1.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/app/resume/history",
    );
  });

  it("shows the insufficient-credit state with a link to Credits when balance is 0", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    expect(screen.getByText(/you need 1 resume review credit/i)).toBeInTheDocument();
    expect(screen.getByText(/your balance: 0/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view credits/i })).toHaveAttribute("href", "/app/credits");
    expect(screen.queryByRole("button", { name: /request review/i })).not.toBeInTheDocument();
  });

  it("requests a review and reflects the under-review state", async () => {
    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ONE_RESUME_REVIEW_CREDIT });
    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    expect(screen.getByText(/1 resume review credit required/i)).toBeInTheDocument();

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
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
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

    fireEvent.click(screen.getByRole("button", { name: /view review/i }));

    expect(screen.getByText("Overall score")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Solid resume.")).toBeInTheDocument();
    expect(screen.getByText("Clear formatting")).toBeInTheDocument();
    expect(screen.getByText("Add a summary")).toBeInTheDocument();
    expect(screen.getByText("Tailor keywords")).toBeInTheDocument();
  });

  it("provides a download link pointing at the resume download endpoint", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);

    const link = await screen.findByRole("link", { name: /view \/ download/i });
    expect(link).toHaveAttribute("href", "/api/candidate/resumes/r1/download");
  });

  it("hides the inline upload panel by default when a resume already exists", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    expect(screen.queryByLabelText(/choose file/i)).not.toBeInTheDocument();
  });

  it("reveals the inline upload panel when 'Upload new version' is clicked", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    expect(screen.getByText(/upload a new resume version/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/choose file/i)).toBeInTheDocument();
  });

  it("keeps the resume card and credit section visible while the upload panel is open", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    expect(screen.getByText("Status: Uploaded")).toBeInTheDocument();
    expect(screen.getByText(/you need 1 resume review credit/i)).toBeInTheDocument();
  });

  it("shows the selected filename and enables 'Upload version' when a valid file is chosen", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    expect(screen.getByRole("button", { name: /upload version/i })).toBeDisabled();

    const file = new File(["content"], "my_cv.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });

    expect(screen.getByText(/selected:.*my_cv\.pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload version$/i })).not.toBeDisabled();
  });

  it("shows an error and keeps 'Upload version' disabled when an unsupported file type is selected", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    const file = new File(["content"], "resume.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/PDF, DOC, or DOCX/i);
    expect(screen.getByRole("button", { name: /^upload version$/i })).toBeDisabled();
  });

  it("shows a Cancel button alongside the upload panel", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
  });

  it("hides the upload panel and clears selection when Cancel is clicked", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    const file = new File(["content"], "draft.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });
    expect(screen.getByText(/selected:.*draft\.pdf/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByLabelText(/choose file/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/selected:/i)).not.toBeInTheDocument();
  });

  it("does not reload data when Cancel is clicked", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");
    const callCount = listResumes.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(listResumes.mock.calls.length).toBe(callCount);
  });

  it("closes the upload panel and refreshes data after a successful upload", async () => {
    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    const V2 = { ...RESUME_V1, id: "r2", version: 2, original_filename: "resume_v2.pdf" };
    uploadResume.mockResolvedValue({ ok: true, data: V2 });
    listResumes.mockResolvedValueOnce({ ok: true, data: [V2, { ...RESUME_V1, is_latest: false }] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });

    const file = new File(["content"], "resume_v2.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /^upload version$/i }));

    await waitFor(() => expect(screen.queryByLabelText(/choose file/i)).not.toBeInTheDocument());
    expect((await screen.findAllByText("resume_v2.pdf")).length).toBeGreaterThanOrEqual(1);
  });

  it("preserves the existing resume and shows the error when upload fails", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    uploadResume.mockResolvedValue({ ok: false, status: 422, error: "File too large." });
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /^upload version$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("File too large.");
    expect(screen.getByLabelText(/choose file/i)).toBeInTheDocument();
    expect(screen.getAllByText("resume_v1.pdf").length).toBeGreaterThanOrEqual(1);
  });

  it("disables the file input and 'Upload version' button while uploading to prevent duplicates", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    uploadResume.mockReturnValue(new Promise(() => {}));
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /^upload version$/i }));

    expect(await screen.findByRole("button", { name: /uploading/i })).toBeDisabled();
    expect(screen.getByLabelText(/choose file/i)).toBeDisabled();
  });

  it("does not create a review request after uploading a new version", async () => {
    listResumes.mockResolvedValueOnce({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ONE_RESUME_REVIEW_CREDIT });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    const V2 = { ...RESUME_V1, id: "r2", version: 2, original_filename: "resume_v2.pdf" };
    uploadResume.mockResolvedValue({ ok: true, data: V2 });
    listResumes.mockResolvedValueOnce({ ok: true, data: [V2, { ...RESUME_V1, is_latest: false }] });
    getReview.mockResolvedValueOnce({ ok: true, data: null });

    const file = new File(["content"], "resume_v2.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/choose file/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /^upload version$/i }));

    await waitFor(() => expect(screen.queryByLabelText(/choose file/i)).not.toBeInTheDocument());
    expect(requestReview).not.toHaveBeenCalled();
  });

  it("calls scrollIntoView on the panel when it opens", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledOnce());
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ block: "nearest" }),
    );
  });

  it("does not call scrollIntoView when the panel is already open and the button is clicked again", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    // Open the panel
    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledOnce());

    // Toggle closed — no additional scroll
    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    expect(scrollIntoViewMock).toHaveBeenCalledOnce();
  });

  it("uses instant scroll when prefers-reduced-motion is set", async () => {
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({ matches: true });

    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledOnce());
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "auto" }),
    );
  });

  it("toggles the upload panel closed when 'Upload new version' is clicked a second time", async () => {
    listResumes.mockResolvedValue({ ok: true, data: [RESUME_V1] });
    getReview.mockResolvedValue({ ok: true, data: null });
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });

    render(<ResumeCentre />);
    await screen.findAllByText("resume_v1.pdf");

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    expect(screen.getByLabelText(/choose file/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /upload new version/i }));
    expect(screen.queryByLabelText(/choose file/i)).not.toBeInTheDocument();
  });
});
