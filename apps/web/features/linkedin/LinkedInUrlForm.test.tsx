import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { saveLinkedInUrl } = vi.hoisted(() => ({ saveLinkedInUrl: vi.fn() }));
vi.mock("@/lib/linkedin/client", () => ({ saveLinkedInUrl }));

import { LinkedInUrlForm } from "./LinkedInUrlForm";

afterEach(() => {
  saveLinkedInUrl.mockReset();
});

describe("LinkedInUrlForm", () => {
  it("renders the URL field", () => {
    render(<LinkedInUrlForm onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/linkedin profile url/i)).toBeInTheDocument();
  });

  it("requires a non-empty URL before saving", async () => {
    render(<LinkedInUrlForm onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter your LinkedIn profile URL.",
    );
    expect(saveLinkedInUrl).not.toHaveBeenCalled();
  });

  it("saves and calls onSaved on success", async () => {
    const onSaved = vi.fn();
    saveLinkedInUrl.mockResolvedValue({ ok: true, data: {} });
    render(<LinkedInUrlForm onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText(/linkedin profile url/i), {
      target: { value: "https://linkedin.com/in/example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saveLinkedInUrl).toHaveBeenCalledWith("https://linkedin.com/in/example");
  });

  it("shows the backend's validation error on failure", async () => {
    saveLinkedInUrl.mockResolvedValue({
      ok: false,
      status: 422,
      error: "Please enter a linkedin.com profile URL.",
    });
    render(<LinkedInUrlForm onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/linkedin profile url/i), {
      target: { value: "https://example.com/profile" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a linkedin.com profile URL.",
    );
  });

  it("pre-fills the initial URL and supports cancel", () => {
    const onCancel = vi.fn();
    render(
      <LinkedInUrlForm
        initialUrl="https://linkedin.com/in/existing"
        onSaved={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByLabelText(/linkedin profile url/i)).toHaveValue(
      "https://linkedin.com/in/existing",
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
