"use client";

import { useEffect, useState } from "react";

import { getUnreadNotificationCount } from "@/lib/notifications/client";

/** The sidebar's unread-count pill for the Notifications nav item.
 * Fetched once on mount -- there's no push/websocket channel in this
 * phase, so it reflects the count as of the last page load/navigation
 * into the shell, same freshness model as every other sidebar item. */
export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadNotificationCount().then((result) => {
      if (result.ok) setUnreadCount(result.data.unread_count);
    });
  }, []);

  if (unreadCount === 0) return null;

  return (
    <span
      aria-label={`${unreadCount} unread notifications`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "1.25rem",
        height: "1.25rem",
        padding: "0 0.375rem",
        borderRadius: "999px",
        background: "var(--color-primary)",
        color: "var(--color-text-on-primary)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
