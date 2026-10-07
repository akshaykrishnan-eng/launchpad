import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Notification } from "@/lib/notifications/types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { NotificationList } from "./NotificationList";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    type: "EVENT_REGISTERED",
    title: "Notification n1",
    message: "Message n1",
    event_id: null,
    read_at: null,
    is_read: false,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  push.mockReset();
});

describe("NotificationList", () => {
  it("renders an EVENT_PUBLISHED notification with its icon container and type label", () => {
    render(
      <NotificationList
        notifications={[
          notification({
            type: "EVENT_PUBLISHED",
            title: "New event available",
            message: "Resume Workshop is now open for registration.",
            event_id: "evt-1",
          }),
        ]}
        onMarkRead={vi.fn()}
      />,
    );

    expect(screen.getByText("New event available")).toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new event available/i }).querySelector(".notification-icon svg"),
    ).toBeInTheDocument();
  });

  it("gives every notification type its own consistent icon container", () => {
    render(
      <NotificationList
        notifications={[notification({ type: "RESUME_REVIEW_COMPLETED" })]}
        onMarkRead={vi.fn()}
      />,
    );

    const row = screen.getByRole("button", { name: /notification n1/i });
    expect(row.querySelector(".notification-icon")).toBeInTheDocument();
    expect(row.querySelector(".notification-icon svg")).toBeInTheDocument();
  });

  it("keeps the whole row as one self-contained button with no overlap-prone fixed height", () => {
    render(<NotificationList notifications={[notification()]} onMarkRead={vi.fn()} />);

    const row = screen.getByRole("button", { name: /notification n1/i });
    expect(row).toHaveClass("notification-row");
    expect(row).toHaveClass("notification-row-unread");
    // Title, message, and the type chip all live inside the same row.
    expect(row).toHaveTextContent("Notification n1");
    expect(row).toHaveTextContent("Message n1");
    expect(row).toHaveTextContent("Event");
  });

  it("renders a read notification without the unread tint or dot", () => {
    render(
      <NotificationList
        notifications={[notification({ is_read: true, read_at: "2026-10-01T01:00:00Z" })]}
        onMarkRead={vi.fn()}
      />,
    );

    const row = screen.getByText("Notification n1").closest(".notification-row");
    expect(row).not.toHaveClass("notification-row-unread");
    expect(row?.querySelector(".notification-dot")).not.toBeInTheDocument();
  });

  it("navigates to the event detail route when an unread EVENT_PUBLISHED notification is clicked", async () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationList
        notifications={[notification({ type: "EVENT_PUBLISHED", event_id: "evt-1" })]}
        onMarkRead={onMarkRead}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /notification n1/i }));

    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(push).toHaveBeenCalledWith("/app/events/evt-1");
  });

  it("navigates on click even when the EVENT_PUBLISHED notification is already read", async () => {
    render(
      <NotificationList
        notifications={[
          notification({
            type: "EVENT_PUBLISHED",
            event_id: "evt-1",
            is_read: true,
            read_at: "2026-10-01T01:00:00Z",
          }),
        ]}
        onMarkRead={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /notification n1/i }));

    expect(push).toHaveBeenCalledWith("/app/events/evt-1");
  });

  it("does not navigate for notification types without a destination", async () => {
    const onMarkRead = vi.fn();
    render(<NotificationList notifications={[notification()]} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByRole("button", { name: /notification n1/i }));

    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a chevron on a clickable row and hides it on a static, already-read row", () => {
    render(
      <NotificationList
        notifications={[
          notification({ id: "clickable", is_read: false }),
          notification({ id: "static", title: "Notification static", is_read: true, read_at: "2026-10-01T01:00:00Z" }),
        ]}
        onMarkRead={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /^notification n1/i }).querySelector(".notification-chevron"),
    ).toBeInTheDocument();
    const staticRow = screen.getByText("Notification static").closest("li");
    expect(staticRow?.querySelector("button")).not.toBeInTheDocument();
    expect(staticRow?.querySelector(".notification-chevron")).not.toBeInTheDocument();
  });
});
