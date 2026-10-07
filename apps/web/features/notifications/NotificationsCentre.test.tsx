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

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { NotificationCountProvider } from "./NotificationCountContext";
import { NotificationsCentre } from "./NotificationsCentre";

function renderCentre() {
  return render(
    <NotificationCountProvider>
      <NotificationsCentre />
    </NotificationCountProvider>,
  );
}

function notification(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    type: "EVENT_REGISTERED",
    title: `Notification ${id}`,
    message: `Message ${id}`,
    event_id: null,
    read_at: null,
    is_read: false,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function page(items: unknown[], total: number, page = 1, page_size = 15) {
  return { ok: true as const, data: { items, total, page, page_size } };
}

afterEach(() => {
  getNotifications.mockReset();
  getUnreadNotificationCount.mockReset();
  markAllNotificationsRead.mockReset();
  markNotificationRead.mockReset();
  push.mockReset();
});

describe("NotificationsCentre", () => {
  it("requests page size 15 for the active tab", async () => {
    getNotifications.mockResolvedValue(page([notification("n1")], 1));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    renderCentre();

    await screen.findByText("Notification n1");
    expect(getNotifications).toHaveBeenCalledWith({ page: 1, page_size: 15, status: "all" });
  });

  it("shows a loading state before data arrives", () => {
    getNotifications.mockReturnValue(new Promise(() => {}));
    getUnreadNotificationCount.mockReturnValue(new Promise(() => {}));

    renderCentre();

    expect(screen.getByText(/loading your notifications/i)).toBeInTheDocument();
  });

  it("shows an error state and supports retry", async () => {
    getNotifications.mockResolvedValueOnce({ ok: false, status: 500, error: "boom" });
    getUnreadNotificationCount.mockResolvedValueOnce({ ok: true, data: { unread_count: 0 } });
    renderCentre();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load");

    getNotifications.mockResolvedValueOnce(page([notification("n1")], 1));
    getUnreadNotificationCount.mockResolvedValueOnce({ ok: true, data: { unread_count: 1 } });
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Notification n1")).toBeInTheDocument();
  });

  it("shows the empty state when there are no notifications", async () => {
    getNotifications.mockResolvedValue(page([], 0));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    renderCentre();

    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders unread and read notifications with distinct affordances", async () => {
    getNotifications.mockResolvedValue(
      page([notification("unread1"), notification("read1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })], 2),
    );
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    renderCentre();

    expect(await screen.findByText("Notification unread1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notification unread1/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /notification read1/i })).not.toBeInTheDocument();
  });

  it("marks a single notification as read on click, non-optimistically", async () => {
    getNotifications.mockResolvedValue(page([notification("n1")], 1));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });
    markNotificationRead.mockResolvedValue({
      ok: true,
      data: notification("n1", { is_read: true, read_at: "2026-10-01T02:00:00Z" }),
    });

    renderCentre();
    const item = await screen.findByRole("button", { name: /notification n1/i });

    await act(async () => {
      fireEvent.click(item);
    });

    expect(await screen.findByText("Notification n1")).toBeInTheDocument();
    expect(markNotificationRead).toHaveBeenCalledWith("n1");
    expect(await screen.findByText("Notification n1")).not.toHaveProperty("tagName", "BUTTON");
  });

  it("leaves a notification unread in the UI if the mark-read request fails", async () => {
    getNotifications.mockResolvedValue(page([notification("n1")], 1));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });
    markNotificationRead.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    renderCentre();
    const item = await screen.findByRole("button", { name: /notification n1/i });
    fireEvent.click(item);

    expect(await screen.findByRole("button", { name: /notification n1/i })).toBeInTheDocument();
  });

  it("decrements the shared unread count after marking one as read", async () => {
    getNotifications.mockResolvedValue(page([notification("n1")], 1));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });
    markNotificationRead.mockResolvedValue({
      ok: true,
      data: notification("n1", { is_read: true, read_at: "2026-10-01T02:00:00Z" }),
    });

    renderCentre();
    const item = await screen.findByRole("button", { name: /notification n1/i });
    await act(async () => {
      fireEvent.click(item);
    });

    // The "All" tab count reflects the global total, unaffected by read state.
    expect(screen.getByRole("tab", { name: "All" })).toHaveTextContent("1");
    // Mark-all-read becomes disabled once nothing is unread.
    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });

  it("marks all notifications as read and clears the unread badge", async () => {
    getNotifications.mockResolvedValue(page([notification("n1"), notification("n2")], 2));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 2 } });
    markAllNotificationsRead.mockResolvedValue({ ok: true, data: { marked_read: 2 } });

    renderCentre();
    await screen.findByText("Notification n1");

    getNotifications.mockResolvedValue(
      page(
        [
          notification("n1", { is_read: true, read_at: "2026-10-01T02:00:00Z" }),
          notification("n2", { is_read: true, read_at: "2026-10-01T02:00:00Z" }),
        ],
        2,
      ),
    );
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    });

    expect(markAllNotificationsRead).toHaveBeenCalled();
    expect(await screen.findByText("Notification n1")).not.toHaveProperty("tagName", "BUTTON");
    expect(screen.queryByRole("button", { name: /notification n2/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });

  it("disables 'Mark all as read' when there is nothing unread", async () => {
    getNotifications.mockResolvedValue(
      page([notification("n1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })], 1),
    );
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    renderCentre();
    await screen.findByText("Notification n1");

    expect(screen.getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });

  it("requests the matching status filter from the server for each tab", async () => {
    getNotifications.mockImplementation((params: { status?: string; page_size?: number }) => {
      if (params.status === "all" && params.page_size === 1) {
        return Promise.resolve(page([], 47, 1, 1));
      }
      if (params.status === "unread") {
        return Promise.resolve(page([notification("unread1")], 3));
      }
      if (params.status === "read") {
        return Promise.resolve(page([notification("read1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })], 44));
      }
      return Promise.resolve(page([notification("unread1"), notification("read1", { is_read: true, read_at: "2026-10-01T01:00:00Z" })], 47));
    });
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 3 } });

    renderCentre();
    await screen.findByText("Notification unread1");
    expect(screen.getByText("Notification read1")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveTextContent("47");
    expect(screen.getByRole("tab", { name: "Unread" })).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: "Read" })).toHaveTextContent("44");

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    await screen.findByText("Notification unread1");
    expect(screen.queryByText("Notification read1")).not.toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith({ page: 1, page_size: 15, status: "unread" });

    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    await screen.findByText("Notification read1");
    expect(screen.queryByText("Notification unread1")).not.toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith({ page: 1, page_size: 15, status: "read" });
  });

  it("shows the unread-specific empty state", async () => {
    getNotifications.mockResolvedValue(page([], 0));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    renderCentre();
    await screen.findByText("No notifications yet");

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(await screen.findByText("No unread notifications")).toBeInTheDocument();
  });

  it("shows the read-specific empty state", async () => {
    getNotifications.mockResolvedValue(page([], 0));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    renderCentre();
    await screen.findByText("No notifications yet");

    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(await screen.findByText("No read notifications yet")).toBeInTheDocument();
  });

  it("paginates across pages using the server-provided total", async () => {
    getNotifications.mockResolvedValueOnce(page([notification("n1")], 25, 1));
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 1 } });

    renderCentre();
    await screen.findByText("Notification n1");
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();

    getNotifications.mockResolvedValueOnce(page([notification("n2")], 25, 2));
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(await screen.findByText("Notification n2")).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledWith({ page: 2, page_size: 15, status: "all" });
  });
});
