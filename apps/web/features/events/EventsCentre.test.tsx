import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getEvents } = vi.hoisted(() => ({ getEvents: vi.fn() }));
vi.mock("@/lib/events/client", () => ({ getEvents }));

import { EventsCentre } from "./EventsCentre";

const UPCOMING_EVENT = {
  id: "evt-1",
  title: "Breaking Into Product Engineering",
  description: "Learn what hiring teams look for.",
  event_type: "WEBINAR",
  status: "PUBLISHED",
  starts_at: "2026-11-20T18:00:00Z",
  ends_at: "2026-11-20T19:00:00Z",
  timezone: "IST",
  location: null,
  meeting_url: null,
  is_registered: false,
};

const PAST_EVENT = {
  ...UPCOMING_EVENT,
  id: "evt-2",
  title: "Resume Writing Workshop",
  status: "COMPLETED",
  starts_at: "2026-09-01T18:00:00Z",
  ends_at: "2026-09-01T19:00:00Z",
};

afterEach(() => {
  getEvents.mockReset();
});

describe("EventsCentre", () => {
  it("shows a loading state before data arrives", () => {
    getEvents.mockReturnValue(new Promise(() => {}));
    render(<EventsCentre />);
    expect(screen.getByText(/loading events/i)).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    getEvents.mockResolvedValue({ ok: false, status: 500, error: "boom" });
    render(<EventsCentre />);
    expect(await screen.findByText("We couldn't load events right now.")).toBeInTheDocument();
  });

  it("shows the empty state when there are no upcoming events", async () => {
    getEvents.mockResolvedValue({ ok: true, data: [] });
    render(<EventsCentre />);
    expect(await screen.findByText("No upcoming events")).toBeInTheDocument();
    expect(screen.getByText("No past events yet.")).toBeInTheDocument();
  });

  it("renders an upcoming event card", async () => {
    getEvents.mockResolvedValue({ ok: true, data: [UPCOMING_EVENT] });
    render(<EventsCentre />);
    expect(await screen.findByText("Breaking Into Product Engineering")).toBeInTheDocument();
    expect(screen.getByText("View details")).toBeInTheDocument();
  });

  it("shows Registered state instead of a register action when already registered", async () => {
    getEvents.mockResolvedValue({
      ok: true,
      data: [{ ...UPCOMING_EVENT, is_registered: true }],
    });
    render(<EventsCentre />);
    expect(await screen.findByText("Registered ✓")).toBeInTheDocument();
    expect(screen.queryByText("View details")).not.toBeInTheDocument();
  });

  it("renders past events separately from upcoming events", async () => {
    getEvents.mockResolvedValue({ ok: true, data: [UPCOMING_EVENT, PAST_EVENT] });
    render(<EventsCentre />);
    expect(await screen.findByText("Breaking Into Product Engineering")).toBeInTheDocument();
    expect(screen.getByText("Resume Writing Workshop")).toBeInTheDocument();
  });
});
