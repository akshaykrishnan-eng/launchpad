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

    // Feedback is not rendered inline before the modal opens.
    expect(screen.queryByText("Great technical depth.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));
    // Modal opens and shows the correct feedback.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Great technical depth.")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    // The feedback heading includes the interview type.
    expect(screen.getByRole("heading", { name: /technical interview feedback/i })).toBeInTheDocument();
  });

  it("closes the feedback modal when the header close button is clicked", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past2",
          interview_type: "HR",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-10T09:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 7,
            confidence_score: 8,
            technical_score: 6,
            answer_structure_score: 7,
            professional_presentation_score: 8,
            overall_score: 72,
            feedback: "Good communication skills.",
            recommendations: [],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);

    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close feedback/i }));
    expect(screen.queryByText("Good communication skills.")).not.toBeInTheDocument();
  });

  it("closes the feedback modal via the footer Close button", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past2b",
          interview_type: "HR",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-11T09:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 7,
            confidence_score: 8,
            technical_score: 6,
            answer_structure_score: 7,
            professional_presentation_score: 8,
            overall_score: 72,
            feedback: "Solid communication overall.",
            recommendations: [],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);

    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));
    expect(screen.getByText("Solid communication overall.")).toBeInTheDocument();

    // Footer "Close" button (distinct from the header icon button)
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByText("Solid communication overall.")).not.toBeInTheDocument();
  });

  it("shows the overall score in the score ring when the modal opens", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past5",
          interview_type: "TECHNICAL",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-15T10:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 8,
            confidence_score: 7,
            technical_score: 9,
            answer_structure_score: 8,
            professional_presentation_score: 7,
            overall_score: 78,
            feedback: "Strong technical performance.",
            recommendations: ["Review system design fundamentals"],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);
    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));

    // Score ring value
    expect(screen.getByText("78")).toBeInTheDocument();
    // Score label
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
    // Score ring progressbar with aria-valuenow
    expect(screen.getByRole("progressbar", { name: /overall score/i })).toHaveAttribute("aria-valuenow", "78");
  });

  it("renders all five evaluation criteria cards in the modal", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past6",
          interview_type: "BEHAVIOURAL",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-20T11:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 8,
            confidence_score: 9,
            technical_score: 7,
            answer_structure_score: 8,
            professional_presentation_score: 8,
            overall_score: 80,
            feedback: "Well-structured answers throughout.",
            recommendations: [],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);
    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));

    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("Technical Knowledge")).toBeInTheDocument();
    expect(screen.getByText("Answer Structure")).toBeInTheDocument();
    expect(screen.getByText("Professional Presentation")).toBeInTheDocument();
    // Heading above the grid
    expect(screen.getByRole("heading", { name: /evaluation criteria/i })).toBeInTheDocument();
  });

  it("displays feedback text and recommendations sections with real data", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past7",
          interview_type: "HR",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-09-25T09:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 9,
            confidence_score: 8,
            technical_score: 7,
            answer_structure_score: 9,
            professional_presentation_score: 9,
            overall_score: 85,
            feedback: "Excellent interpersonal skills on display.",
            recommendations: ["Prepare STAR stories", "Research the company culture"],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);
    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));

    expect(screen.getByRole("heading", { name: /^feedback$/i })).toBeInTheDocument();
    expect(screen.getByText("Excellent interpersonal skills on display.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recommendations/i })).toBeInTheDocument();
    expect(screen.getByText("Prepare STAR stories")).toBeInTheDocument();
    expect(screen.getByText("Research the company culture")).toBeInTheDocument();
  });

  it("omits the Recommendations section when the API returns an empty array", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past8",
          interview_type: "FINAL_PREP",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-10-01T14:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 9,
            confidence_score: 9,
            technical_score: 9,
            answer_structure_score: 9,
            professional_presentation_score: 9,
            overall_score: 95,
            feedback: "Outstanding preparation.",
            recommendations: [],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);
    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));

    expect(screen.queryByRole("heading", { name: /recommendations/i })).not.toBeInTheDocument();
  });

  it("shows a graceful empty state when feedback is null for a completed interview", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past3",
          interview_type: "BEHAVIOURAL",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-08-20T11:00:00Z",
          created_at: "x",
          feedback: null,
        },
      ],
    });

    render(<MockInterviewCentre />);

    // No "View Feedback" button when there is no feedback.
    await screen.findByText("Behavioural Interview");
    expect(screen.queryByRole("button", { name: /view feedback/i })).not.toBeInTheDocument();
  });

  it("does not expand feedback inline beneath the interview card", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past4",
          interview_type: "FINAL_PREP",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-07-05T14:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 9,
            confidence_score: 9,
            technical_score: 8,
            answer_structure_score: 9,
            professional_presentation_score: 9,
            overall_score: 90,
            feedback: "Excellent final prep session.",
            recommendations: ["Keep practising"],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);

    await screen.findByRole("button", { name: /view feedback/i });
    // Feedback text must not be visible before clicking the button.
    expect(screen.queryByText("Excellent final prep session.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view feedback/i }));
    // Feedback renders inside the modal, not below the card.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Excellent final prep session.")).toBeInTheDocument();
  });

  it("preserves the interview list after closing the feedback modal", async () => {
    getCredits.mockResolvedValue({ ok: true, data: ZERO_BALANCES });
    listInterviews.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "past9",
          interview_type: "TECHNICAL",
          role: null,
          status: "COMPLETED",
          scheduled_at: "2026-08-01T10:00:00Z",
          created_at: "x",
          feedback: {
            communication_score: 7,
            confidence_score: 7,
            technical_score: 8,
            answer_structure_score: 7,
            professional_presentation_score: 7,
            overall_score: 71,
            feedback: "Good technical depth.",
            recommendations: [],
            created_at: "x",
          },
        },
      ],
    });

    render(<MockInterviewCentre />);

    fireEvent.click(await screen.findByRole("button", { name: /view feedback/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close feedback/i }));
    // Interview list remains unchanged after close
    expect(await screen.findByText("Technical Interview")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Good technical depth.")).not.toBeInTheDocument();
  });

});
