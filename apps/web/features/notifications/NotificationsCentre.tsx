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

type ReadFilter = "all" | "unread" | "read";

const READ_FILTERS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export function NotificationsCentre() {
  const [page, setPage] = useState(1);
  // Client-side only, over the current server-paginated page's items --
  // there's no server-side filter endpoint, and adding one just for
  // this cosmetic tab isn't warranted (PRD/Phase 13.5 brief section 8).
  const [filter, setFilter] = useState<ReadFilter>("all");
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
      <div style={{ maxWidth: "28rem", margin: "2.5rem auto" }}>
        <EmptyState
          heading="No notifications yet"
          description="Important updates about your Launchpad activity will appear here."
        />
      </div>
    );
  }

  const currentPageItems = notifications ?? [];
  const pageUnreadCount = currentPageItems.filter((n) => !n.is_read).length;
  // Counts reflect the current server-paginated page, matching what the
  // tabs below actually filter (there's no server-side filter endpoint --
  // see the `filter` state comment above) rather than the cross-page
  // `total`/`unreadCount`, which would make e.g. "Unread 1" show while
  // zero unread rows are visible on this page.
  const filterCounts: Record<ReadFilter, number> = {
    all: currentPageItems.length,
    unread: pageUnreadCount,
    read: currentPageItems.length - pageUnreadCount,
  };

  const visibleNotifications = currentPageItems.filter((notification) => {
    if (filter === "unread") return !notification.is_read;
    if (filter === "read") return notification.is_read;
    return true;
  });

  return (
    <div className="page-section">
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

      <div role="tablist" aria-label="Filter notifications" className="notification-tabs">
        {READ_FILTERS.map((option) => {
          const isActive = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={option.label}
              className="notification-tab"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <span className="notification-tab-count" aria-hidden="true">
                {filterCounts[option.value]}
              </span>
            </button>
          );
        })}
      </div>

      {visibleNotifications.length === 0 ? (
        <p className="page-section-hint" style={{ padding: "0.5rem 0" }}>
          No {filter} notifications on this page.
        </p>
      ) : (
        <NotificationList notifications={visibleNotifications} onMarkRead={handleMarkRead} />
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
