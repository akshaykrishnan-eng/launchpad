"use client";

import { useEffect, useState } from "react";

import { getUnreadNotificationCount } from "@/lib/notifications/client";

type NotificationBadgeProps = {
  /** When provided (even `null` while a shared fetch is still in
   * flight), the badge renders from this value instead of fetching its
   * own count -- used by AppShell to fetch the unread count once and
   * share it between the sidebar and the global top bar's bell, rather
   * than each instance fetching independently. Omitting the prop keeps
   * the original self-fetching behavior. */
  unreadCount?: number | null;
};

/** The sidebar's (and, since Phase 13.5, the global top bar's) unread-
 * count pill. Fetched once on mount -- there's no push/websocket
 * channel in this phase, so it reflects the count as of the last page
 * load/navigation into the shell, same freshness model as every other
 * sidebar item. */
export function NotificationBadge({ unreadCount: controlledCount }: NotificationBadgeProps = {}) {
  const isControlled = controlledCount !== undefined;
  const [selfFetchedCount, setSelfFetchedCount] = useState(0);

  useEffect(() => {
    if (isControlled) return;
    getUnreadNotificationCount().then((result) => {
      if (result.ok) setSelfFetchedCount(result.data.unread_count);
    });
  }, [isControlled]);

  const unreadCount = isControlled ? controlledCount ?? 0 : selfFetchedCount;

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
