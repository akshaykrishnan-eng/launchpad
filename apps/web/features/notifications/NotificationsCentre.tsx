"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { NotificationList } from "@/features/notifications/NotificationList";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/client";
import type { Notification } from "@/lib/notifications/types";

const PAGE_SIZE = 20;

export function NotificationsCentre() {
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [total, setTotal] = useState(0);
  // Tracked separately from the current page's items: whether "Mark
  // all as read" should be enabled depends on unread notifications
  // across *all* pages, not just the one currently shown.
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // The .then() callback is written inline, directly in the effect
  // body (same reasoning as every other *Centre -- see
  // features/resume/ResumeCentre.tsx).
  useEffect(() => {
    Promise.all([getNotifications({ page, page_size: PAGE_SIZE }), getUnreadNotificationCount()]).then(
      ([listResult, unreadResult]) => {
        if (!listResult.ok || !unreadResult.ok) {
          setHasError(true);
          return;
        }
        setHasError(false);
        setNotifications(listResult.data.items);
        setTotal(listResult.data.total);
        setUnreadCount(unreadResult.data.unread_count);
      },
    );
  }, [page]);

  const refresh = useCallback(() => {
    setNotifications(null);
    setHasError(false);
    Promise.all([getNotifications({ page, page_size: PAGE_SIZE }), getUnreadNotificationCount()]).then(
      ([listResult, unreadResult]) => {
        if (!listResult.ok || !unreadResult.ok) {
          setHasError(true);
          return;
        }
        setNotifications(listResult.data.items);
        setTotal(listResult.data.total);
        setUnreadCount(unreadResult.data.unread_count);
      },
    );
  }, [page]);

  // Never optimistic: local state only changes once the API call has
  // actually succeeded, so a failure never leaves the UI showing a
  // read-state the backend doesn't agree with (PRD section 10).
  const handleMarkRead = useCallback(async (id: string) => {
    const result = await markNotificationRead(id);
    if (!result.ok) return;
    setNotifications((current) =>
      current ? current.map((n) => (n.id === id ? result.data : n)) : current,
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAllRead(true);
    const result = await markAllNotificationsRead();
    setIsMarkingAllRead(false);
    if (!result.ok) return;
    setNotifications((current) =>
      current ? current.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })) : current,
    );
    setUnreadCount(0);
  }, []);

  if (notifications === null && !hasError) {
    return <CentreLoadingSkeleton label="Loading your notifications..." />;
  }

  if (hasError) {
    return <ErrorState message="We couldn't load your notifications right now." onRetry={refresh} />;
  }

  if ((notifications ?? []).length === 0) {
    return (
      <EmptyState
        heading="No notifications yet"
        description="Important updates about your Launchpad activity will appear here."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="page-section-header">
        <h2 className="page-section-title">Your notifications</h2>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || isMarkingAllRead}
        >
          Mark all as read
        </button>
      </div>

      <NotificationList notifications={notifications ?? []} onMarkRead={handleMarkRead} />

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
