import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getResumeHistory } = vi.hoisted(() => ({
  getResumeHistory: vi.fn(),
}));
vi.mock("@/lib/resume/client", () => ({
  getResumeHistory,
  getReview: vi.fn(),
  downloadUrl: (id: string) => `/api/candidate/resumes/${id}/download`,
}));

import { ResumeHistoryCentre } from "./ResumeHistoryCentre";

function resume(version: number) {
  return {
    id: `r${version}`,
    version,
    original_filename: `resume_v${version}.pdf`,
    content_type: "application/pdf",
    file_size: 1234,
    status: "UPLOADED" as const,
    uploaded_at: "2026-09-10T00:00:00Z",
    is_latest: version === 5,
  };
}

afterEach(() => {
  getResumeHistory.mockReset();
});

describe("ResumeHistoryCentre", () => {
  it("shows a loading state before data arrives", () => {
    getResumeHistory.mockReturnValue(new Promise(() => {}));

    render(<ResumeHistoryCentre />);

    expect(screen.getByText(/loading your resume history/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getResumeHistory.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    render(<ResumeHistoryCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getResumeHistory.mockResolvedValueOnce({
      ok: true,
      data: { items: [resume(1)], total: 1, page: 1, page_size: 20 },
    });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("resume_v1.pdf")).toBeInTheDocument();
  });

  it("shows an empty state when there are no previous versions", async () => {
    getResumeHistory.mockResolvedValue({
      ok: true,
      data: { items: [], total: 0, page: 1, page_size: 20 },
    });

    render(<ResumeHistoryCentre />);

    expect(await screen.findByText(/no previous resume versions yet/i)).toBeInTheDocument();
    expect(screen.getByText(/upload your first resume/i)).toBeInTheDocument();
  });

  it("paginates across pages without fetching everything at once", async () => {
    getResumeHistory.mockResolvedValueOnce({
      ok: true,
      data: { items: [resume(5)], total: 25, page: 1, page_size: 20 },
    });

    render(<ResumeHistoryCentre />);
    await screen.findByText("resume_v5.pdf");

    expect(getResumeHistory).toHaveBeenCalledWith({ page: 1, page_size: 20 });
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    getResumeHistory.mockResolvedValueOnce({
      ok: true,
      data: { items: [resume(4)], total: 25, page: 2, page_size: 20 },
    });
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(await screen.findByText("resume_v4.pdf")).toBeInTheDocument();
    expect(getResumeHistory).toHaveBeenCalledWith({ page: 2, page_size: 20 });
  });
});
