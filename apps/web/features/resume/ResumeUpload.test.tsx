import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { uploadResume } = vi.hoisted(() => ({ uploadResume: vi.fn() }));
vi.mock("@/lib/resume/client", () => ({ uploadResume }));

import { ResumeUpload } from "./ResumeUpload";

afterEach(() => {
  uploadResume.mockReset();
});

function selectFile(name: string, type: string) {
  const file = new File(["content"], name, { type });
  const input = screen.getByLabelText(/upload resume/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("ResumeUpload", () => {
  it("renders a file input", () => {
    render(<ResumeUpload onUploaded={vi.fn()} />);

    expect(screen.getByLabelText(/upload resume/i)).toBeInTheDocument();
  });

  it("rejects an unsupported extension before calling the API", async () => {
    render(<ResumeUpload onUploaded={vi.fn()} />);

    selectFile("resume.txt", "text/plain");

    expect(await screen.findByRole("alert")).toHaveTextContent("PDF, DOC, or DOCX");
    expect(uploadResume).not.toHaveBeenCalled();
  });

  it("uploads a valid file and calls onUploaded with the result", async () => {
    const onUploaded = vi.fn();
    uploadResume.mockResolvedValue({
      ok: true,
      data: { id: "r1", version: 1, original_filename: "resume.pdf" },
    });
    render(<ResumeUpload onUploaded={onUploaded} />);

    selectFile("resume.pdf", "application/pdf");

    await waitFor(() => expect(onUploaded).toHaveBeenCalled());
    expect(uploadResume).toHaveBeenCalled();
  });

  it("shows the backend's error message when upload fails", async () => {
    uploadResume.mockResolvedValue({ ok: false, status: 422, error: "Unsupported file type." });
    render(<ResumeUpload onUploaded={vi.fn()} />);

    selectFile("resume.pdf", "application/pdf");

    expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported file type.");
  });
});
