import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } =
  vi.hoisted(() => ({
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
  }));
vi.mock("@/lib/notifications/client", () => ({
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
}));

import { NotificationsCentre } from "./NotificationsCentre";

function notification(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    type: "EVENT_REGISTERED",
    title: `Notification ${id}`,
    message: `Message ${id}`,
    read_at: null,
    is_read: false,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  getNotifications.mockReset();
  getUnreadNotificationCount.mockReset();
  markAllNotificationsRead.mockReset();
  markNotificationRead.mockReset();
});

describe("NotificationsCentre", () => {
  it("shows a loading state before data arrives", () => {
    getNotifications.mockReturnValue(new Promise(() => {}));
    getUnreadNotificationCount.mockReturnValue(new Promise(() => {}));

    render(<NotificationsCentre />);

    expect(screen.getByText(/loading your notifications/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getNotifications.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    getUnreadNotificationCount.mockResolvedValueOnce({ ok: true, data: { unread_count: 0 } });
    render(<NotificationsCentre />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getNotifications.mockResolvedValueOnce({
      ok: true,
      data: { items: [notification("n1")], total: 1, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValueOnce({ ok: true, data: { unread_count: 1 } });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Notification n1")).toBeInTheDocument();
  });

  it("shows the empty state when there are no notifications", async () => {
    getNotifications.mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, page_size: 20 } });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    render(<NotificationsCentre />);

    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders unread and read notifications with distinct affordances", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: {
        items: [notification("unread1"), notification("read1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })],
        total: 2,
        page: 1,
        page_size: 20,
      },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    render(<NotificationsCentre />);

    expect(await screen.findByText("Notification unread1")).toBeInTheDocument();
    // Unread notifications are clickable (mark-as-read); read ones are not.
    expect(screen.getByRole("button", { name: /notification unread1/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notification read1/i })).not.toBeInTheDocument();
  });

  it("marks a single notification as read on click, non-optimistically", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: { items: [notification("n1")], total: 1, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });
    markNotificationRead.mockResolvedValue({
      ok: true,
      data: notification("n1", { is_read: true, read_at: "2026-10-01T02:00:00Z" }),
    });

    render(<NotificationsCentre />);
    const item = await screen.findByRole("button", { name: /notification n1/i });

    await act(async () => {
      fireEvent.click(item);
    });

    expect(await screen.findByText("Notification n1")).toBeInTheDocument();
    expect(markNotificationRead).toHaveBeenCalledWith("n1");
    // Once marked read, it's no longer rendered as a clickable button.
    expect(await screen.findByText("Notification n1")).not.toHaveProperty("tagName", "BUTTON");
  });

  it("leaves a notification unread in the UI if the mark-read request fails", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: { items: [notification("n1")], total: 1, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });
    markNotificationRead.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    render(<NotificationsCentre />);
    const item = await screen.findByRole("button", { name: /notification n1/i });
    fireEvent.click(item);

    // No optimistic update: still rendered as an unread, clickable item.
    expect(await screen.findByRole("button", { name: /notification n1/i })).toBeInTheDocument();
  });

  it("marks all notifications as read", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: { items: [notification("n1"), notification("n2")], total: 2, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 2 } });
    markAllNotificationsRead.mockResolvedValue({ ok: true, data: { marked_read: 2 } });

    render(<NotificationsCentre />);
    await screen.findByText("Notification n1");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    });

    expect(markAllNotificationsRead).toHaveBeenCalled();
    expect(await screen.findByText("Notification n1")).not.toHaveProperty("tagName", "BUTTON");
    expect(screen.queryByRole("button", { name: /notification n2/i })).not.toBeInTheDocument();
  });

  it("disables 'Mark all as read' when there is nothing unread", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: { items: [notification("n1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })], total: 1, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    render(<NotificationsCentre />);
    await screen.findByText("Notification n1");

    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });

  it("filters the current page's notifications by read state", async () => {
    getNotifications.mockResolvedValue({
      ok: true,
      data: {
        items: [notification("unread1"), notification("read1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })],
        total: 2,
        page: 1,
        page_size: 20,
      },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    render(<NotificationsCentre />);
    await screen.findByText("Notification unread1");
    expect(screen.getByText("Notification read1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(screen.getByText("Notification unread1")).toBeInTheDocument();
    expect(screen.queryByText("Notification read1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(screen.queryByText("Notification unread1")).not.toBeInTheDocument();
    expect(screen.getByText("Notification read1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByText("Notification unread1")).toBeInTheDocument();
    expect(screen.getByText("Notification read1")).toBeInTheDocument();
  });

  it("paginates across pages", async () => {
    getNotifications.mockResolvedValueOnce({
      ok: true,
      data: { items: [notification("n1")], total: 25, page: 1, page_size: 20 },
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    render(<NotificationsCentre />);
    await screen.findByText("Notification n1");
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    getNotifications.mockResolvedValueOnce({
      ok: true,
      data: { items: [notification("n2")], total: 25, page: 2, page_size: 20 },
    });
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(await screen.findByText("Notification n2")).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith({ page: 2, page_size: 20 });
  });
});
