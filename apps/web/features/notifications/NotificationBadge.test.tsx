import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getUnreadNotificationCount } = vi.hoisted(() => ({
  getUnreadNotificationCount: vi.fn(),
}));
vi.mock("@/lib/notifications/client", () => ({ getUnreadNotificationCount }));

import { NotificationBadge } from "./NotificationBadge";

afterEach(() => {
  getUnreadNotificationCount.mockReset();
});

describe("NotificationBadge", () => {
  it("renders nothing when there are no unread notifications", async () => {
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 0 } });

    const { container } = render(<NotificationBadge />);
    await Promise.resolve();

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the unread count when there are unread notifications", async () => {
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 3 } });

    render(<NotificationBadge />);

    expect(await screen.findByText("3")).toBeInTheDocument();
  });

  it("caps the displayed count at 99+", async () => {
    getUnreadNotificationCount.mockResolvedValue({ ok: true, data: { unread_count: 150 } });

    render(<NotificationBadge />);

    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("renders nothing if the fetch fails", async () => {
    getUnreadNotificationCount.mockResolvedValue({ ok: false, status: 500, error: "boom" });

    const { container } = render(<NotificationBadge />);
    await Promise.resolve();

    expect(container).toBeEmptyDOMElement();
  });
});
