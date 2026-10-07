import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getMockInterview, completeMockInterview } = vi.hoisted(() => ({
  getMockInterview: vi.fn(),
  completeMockInterview: vi.fn(),
}));
vi.mock("@/lib/admin/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/client")>("@/lib/admin/client");
  return { ...actual, getMockInterview, completeMockInterview };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { MockInterviewDetail } from "./MockInterviewDetail";

const BOOKED_ITEM = {
  interview: { id: "mi1", interview_type: "HR", role: null, status: "BOOKED", scheduled_at: "2026-11-01T10:00:00Z", created_at: "x", feedback: null },
  candidate: { id: "c1", email: "dana@example.com", first_name: "Dana", last_name: "Lee" },
};

const SCORES = {
  communication_score: "8",
  confidence_score: "7",
  technical_score: "9",
  answer_structure_score: "8",
  professional_presentation_score: "8",
};

afterEach(() => {
  getMockInterview.mockReset();
  completeMockInterview.mockReset();
});

function fillScores() {
  fireEvent.change(screen.getByLabelText(/communication/i), { target: { value: SCORES.communication_score } });
  fireEvent.change(screen.getByLabelText(/confidence/i), { target: { value: SCORES.confidence_score } });
  fireEvent.change(screen.getByLabelText(/technical knowledge/i), { target: { value: SCORES.technical_score } });
  fireEvent.change(screen.getByLabelText(/answer structure/i), { target: { value: SCORES.answer_structure_score } });
  fireEvent.change(screen.getByLabelText(/professional presentation/i), { target: { value: SCORES.professional_presentation_score } });
  fireEvent.change(screen.getByLabelText(/overall score/i), { target: { value: "82" } });
  fireEvent.change(screen.getByLabelText(/^feedback$/i), { target: { value: "Great technical depth." } });
}

describe("MockInterviewDetail", () => {
  it("shows an error state when the interview fails to load", async () => {
    getMockInterview.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    render(<MockInterviewDetail interviewId="mi1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");
  });

  it("completes a BOOKED interview and then shows the recorded feedback", async () => {
    getMockInterview.mockResolvedValue({ ok: true, data: BOOKED_ITEM });

    render(<MockInterviewDetail interviewId="mi1" />);

    expect(await screen.findByText("Dana Lee")).toBeInTheDocument();
    expect(screen.getByText("HR Interview")).toBeInTheDocument();

    fillScores();

    completeMockInterview.mockResolvedValue({
      ok: true,
      data: { communication_score: 8, confidence_score: 7, technical_score: 9, answer_structure_score: 8, professional_presentation_score: 8, overall_score: 82, feedback: "Great technical depth.", recommendations: [], created_at: "x" },
    });
    getMockInterview.mockResolvedValue({
      ok: true,
      data: {
        ...BOOKED_ITEM,
        interview: {
          ...BOOKED_ITEM.interview,
          status: "COMPLETED",
          feedback: { communication_score: 8, confidence_score: 7, technical_score: 9, answer_structure_score: 8, professional_presentation_score: 8, overall_score: 82, feedback: "Great technical depth.", recommendations: [], created_at: "x" },
        },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /complete interview/i }));

    await waitFor(() =>
      expect(completeMockInterview).toHaveBeenCalledWith(
        "mi1",
        expect.objectContaining({ overall_score: 82, feedback: "Great technical depth." }),
      ),
    );
    expect(await screen.findByText("Great technical depth.")).toBeInTheDocument();
  });

  it("rejects an out-of-range area score client-side without calling the API", async () => {
    getMockInterview.mockResolvedValue({ ok: true, data: BOOKED_ITEM });

    render(<MockInterviewDetail interviewId="mi1" />);
    await screen.findByText("Dana Lee");

    fireEvent.change(screen.getByLabelText(/communication/i), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(/confidence/i), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText(/technical knowledge/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/answer structure/i), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText(/professional presentation/i), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText(/overall score/i), { target: { value: "82" } });
    fireEvent.change(screen.getByLabelText(/^feedback$/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /complete interview/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/between 0 and 10/i);
    expect(completeMockInterview).not.toHaveBeenCalled();
  });

  it("shows a cancelled interview as read-only with no completion form", async () => {
    getMockInterview.mockResolvedValue({ ok: true, data: { ...BOOKED_ITEM, interview: { ...BOOKED_ITEM.interview, status: "CANCELLED" } } });

    render(<MockInterviewDetail interviewId="mi1" />);

    expect(await screen.findByText("This interview was cancelled.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete interview/i })).not.toBeInTheDocument();
  });
});
