import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  getCredits,
  listInterviews,
  getCreditTransactions,
  getAvailableSlots,
  bookInterview,
} = vi.hoisted(() => ({
  getCredits: vi.fn(),
  listInterviews: vi.fn(),
  getCreditTransactions: vi.fn(),
  getAvailableSlots: vi.fn(),
  bookInterview: vi.fn(),
}));
vi.mock("@/lib/mock-interviews/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mock-interviews/client")>(
    "@/lib/mock-interviews/client",
  );
  return { ...actual, getCredits, listInterviews, getCreditTransactions, getAvailableSlots, bookInterview };
});

import { MockInterviewCentre } from "./MockInterviewCentre";

const ZERO_BALANCES = [
  { credit_type: "MOCK_INTERVIEW", balance: 0 },
  { credit_type: "CAREER_COACHING", balance: 0 },
  { credit_type: "RESUME_REVIEW", balance: 0 },
  { credit_type: "LINKEDIN_REVIEW", balance: 0 },
];

const ONE_MOCK_INTERVIEW_CREDIT = [
  { credit_type: "MOCK_INTERVIEW", balance: 1 },
  { credit_type: "CAREER_COACHING", balance: 0 },
  { credit_type: "RESUME_REVIEW", balance: 0 },
  { credit_type: "LINKEDIN_REVIEW", balance: 0 },
];

afterEach(() => {
  getCredits.mockReset();
  listInterviews.mockReset();
  getCreditTransactions.mockReset();
  getAvailableSlots.mockReset();
  bookInterview.mockReset();
});

describe("MockInterviewCentre", () => {
  it("shows a loading state before data arrives", () => {
    getCredits.mockReturnValue(new Promise(() => {}));
    listInterviews.mockReturnValue(new Promise(() => {}));

    render(<MockInterviewCentre />);

    expect(screen.getByText(/loading your mock interviews/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getCredits.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    listInterviews.mockResolvedValueOnce({ ok: true, data: [] });
    render(<MockInterviewCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getCredits.mockResolvedValueOnce({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValueOnce({ ok: true, data: [] });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("No mock interviews yet")).toBeInTheDocument();
  });

  it("shows the empty interview state without the full credit wallet", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({ ok: true, data: [] });

    render(<MockInterviewCentre />);

    expect(await screen.findByText("No mock interviews yet")).toBeInTheDocument();
    // No duplicated full wallet: no other credit types are rendered here,
    // and a link to the dedicated Credits page replaces that section.
    expect(screen.queryByText("Career Coaching")).not.toBeInTheDocument();
    expect(screen.queryByText("Resume Review")).not.toBeInTheDocument();
    expect(screen.queryByText("LinkedIn Review")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view transaction history/i })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /view credits/i })) {
      expect(link).toHaveAttribute("href", "/app/credits");
    }
  });

  it("shows the insufficient-credit notice with a link to Credits instead of a booking button when balance is 0", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({ ok: true, data: [] });

    render(<MockInterviewCentre />);

    expect(await screen.findByText(/don't have enough Mock Interview credits/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /book a mock interview/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view credits/i }).length).toBeGreaterThan(0);
  });

  it("walks through booking an interview end to end", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ONE_MOCK_INTERVIEW_CREDIT });
    // Not *Once*: booking success triggers a refresh, which calls this
    // again -- it needs a stable implementation across both calls.
    listInterviews.mockResolvedValue({ ok: true, data: [] });
    getAvailableSlots.mockResolvedValue({
      ok: true,
      data: [{ id: "slot1", interview_type: "HR", starts_at: "2026-10-10T10:00:00Z", ends_at: "2026-10-10T10:30:00Z" }],
    });
    bookInterview.mockResolvedValue({
      ok: true,
      data: {
        id: "mi1",
        interview_type: "HR",
        role: null,
        status: "BOOKED",
        scheduled_at: "2026-10-10T10:00:00Z",
        created_at: "x",
        feedback: null,
      },
    });

    render(<MockInterviewCentre />);

    fireEvent.click(await screen.findByRole("button", { name: /book a mock interview/i }));
    fireEvent.click(screen.getByRole("button", { name: "HR Interview" }));

    await waitFor(() => expect(getAvailableSlots).toHaveBeenCalledWith("HR"));
    fireEvent.click(await screen.findByText(/2026|Oct/));

    fireEvent.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => expect(bookInterview).toHaveBeenCalledWith("slot1", undefined));
  });

  it("requires a role before continuing a role-specific booking", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ONE_MOCK_INTERVIEW_CREDIT });
    listInterviews.mockResolvedValue({ ok: true, data: [] });

    render(<MockInterviewCentre />);

    fireEvent.click(await screen.findByRole("button", { name: /book a mock interview/i }));
    fireEvent.click(screen.getByRole("button", { name: "Role-Specific Interview" }));

    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/which role/i), {
      target: { value: "Python Backend Engineer" },
    });
    expect(continueButton).not.toBeDisabled();
  });

  it("separates booked interviews from completed/cancelled ones", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "upcoming1",
          interview_type: "HR",
          role: null,
          status: "BOOKED",
          scheduled_at: "2026-12-01T10:00:00Z",
          created_at: "x",
          feedback: null,
        },
        {
          id: "past1",
          interview_type: "TECHNICAL",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-01T10:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 8,
            confidence_score: 7,
            technical_score: 9,
            answer_structure_score: 8,
            professional_presentation_score: 8,
            overall_score: 82,
            feedback: "Great technical depth.",
            recommendations: ["Practice whiteboarding"],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);

    expect(await screen.findByText("HR Interview")).toBeInTheDocument();
    expect(screen.getByText("Technical Interview")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    expect(screen.queryByText("Great technical depth.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));
    expect(screen.getByText("Great technical depth.")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

});
