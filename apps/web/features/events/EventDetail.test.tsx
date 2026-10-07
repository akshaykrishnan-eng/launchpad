import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getEvent, registerForEvent } = vi.hoisted(() => ({
  getEvent: vi.fn(),
  registerForEvent: vi.fn(),
}));
vi.mock("@/lib/events/client", () => ({ getEvent, registerForEvent }));

import { EventDetail } from "./EventDetail";

const EVENT = {
  id: "evt-1",
  title: "Breaking Into Product Engineering",
  description: "Learn what hiring teams look for.",
  event_type: "WEBINAR",
  status: "PUBLISHED",
  starts_at: "2026-11-20T18:00:00Z",
  ends_at: "2026-11-20T19:00:00Z",
  timezone: "IST",
  location: null,
  meeting_url: "https://zoom.us/j/123",
  is_registered: false,
};

afterEach(() => {
  getEvent.mockReset();
  registerForEvent.mockReset();
});

describe("EventDetail", () => {
  it("shows a loading state before data arrives", () => {
    getEvent.mockReturnValue(new Promise(() => {}));
    render(<EventDetail eventId="evt-1" />);
    expect(screen.getByText(/loading event/i)).toBeInTheDocument();
  });

  it("shows a not-found state for a missing event", async () => {
    getEvent.mockResolvedValue({ ok: false, status: 404, error: "Event not found" });
    render(<EventDetail eventId="evt-1" />);
    expect(await screen.findByText("This event couldn't be found.")).toBeInTheDocument();
  });

  it("renders event details and a Register action", async () => {
    getEvent.mockResolvedValue({ ok: true, data: EVENT });
    render(<EventDetail eventId="evt-1" />);
    expect(await screen.findByText("Breaking Into Product Engineering")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
    // Meeting URL is withheld until the candidate is registered.
    expect(screen.queryByText(EVENT.meeting_url)).not.toBeInTheDocument();
  });

  it("registers and shows the Registered state, including the meeting URL", async () => {
    getEvent.mockResolvedValueOnce({ ok: true, data: EVENT });
    registerForEvent.mockResolvedValue({
      ok: true,
      data: { event_id: "evt-1", registered: true, registered_at: "now" },
    });
    getEvent.mockResolvedValueOnce({ ok: true, data: { ...EVENT, is_registered: true } });

    render(<EventDetail eventId="evt-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Register" }));

    expect(await screen.findByText("Registered ✓")).toBeInTheDocument();
    expect(screen.getByText(EVENT.meeting_url)).toBeInTheDocument();
  });

  it("shows a registration error without losing the event view", async () => {
    getEvent.mockResolvedValue({ ok: true, data: EVENT });
    registerForEvent.mockResolvedValue({ ok: false, status: 409, error: "Already registered." });

    render(<EventDetail eventId="evt-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Register" }));

    expect(await screen.findByText("Already registered.")).toBeInTheDocument();
  });

  it("disables registration for a past/completed event", async () => {
    getEvent.mockResolvedValue({ ok: true, data: { ...EVENT, status: "COMPLETED" } });
    render(<EventDetail eventId="evt-1" />);
    expect(await screen.findByText(/registration is closed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Register" })).not.toBeInTheDocument();
  });
});
