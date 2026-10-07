"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { CentreLoadingSkeleton } from "@/components/Skeleton";
import { useNotificationCount } from "@/features/notifications/NotificationCountContext";
import { NotificationList } from "@/features/notifications/NotificationList";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/client";
import type { Notification } from "@/lib/notifications/types";

const PAGE_SIZE = 15;

type ReadFilter = "all" | "unread" | "read";

const READ_FILTERS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const EMPTY_STATE_COPY: Record<ReadFilter, { heading: string; description: string }> = {
  all: {
    heading: "No notifications yet",
    description: "Important updates about your Launchpad activity will appear here.",
  },
  unread: {
    heading: "No unread notifications",
    description: "You're all caught up.",
  },
  read: {
    heading: "No read notifications yet",
    description: "Notifications you've opened will show up here.",
  },
};

export function NotificationsCentre() {
  const [page, setPage] = useState(1);
  // Each tab is a real, independently-paginated server-side filter
  // (status=all|unread|read) -- not a client-side slice of whatever
  // page happens to be loaded.
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [total, setTotal] = useState(0);
  // Global counts across the whole history, for the tab labels --
  // distinct from `total`, which is the active tab/page's count.
  const [allTotal, setAllTotal] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const { unreadCount, setUnreadCount, refreshUnreadCount } = useNotificationCount();

  // Builds and applies the fetch for the current page/filter. No
  // setState happens before the returned promise settles, so this is
  // safe to call directly from the effect body (see
  // ResumeHistoryCentre.tsx / CreditHistoryCentre.tsx for why that
  // matters for the set-state-in-effect lint rule) as well as from the
  // explicit `refresh`/mark-all-read callbacks below.
  const fetchAndApply = useCallback(() => {
    // Cheap (page_size=1) call purely for the "All" tab's global total
    // when it isn't already the active tab; reused instead of a
    // bespoke counts endpoint.
    const allTotalRequest =
      filter === "all" ? null : getNotifications({ page: 1, page_size: 1, status: "all" });

    return Promise.all([
      getNotifications({ page, page_size: PAGE_SIZE, status: filter }),
      allTotalRequest,
    ]).then(([listResult, allResult]) => {
      if (!listResult.ok || (allResult && !allResult.ok)) {
        setHasError(true);
        return;
      }
      setHasError(false);
      setNotifications(listResult.data.items);
      setTotal(listResult.data.total);
      setAllTotal(allResult ? allResult.data.total : listResult.data.total);
      refreshUnreadCount();
    });
  }, [page, filter, refreshUnreadCount]);

  // Reset to page 1 whenever the tab changes, so switching from a
  // filtered tab's page 3 doesn't request an out-of-range page on the
  // next tab.
  const handleFilterChange = useCallback((next: ReadFilter) => {
    setFilter(next);
    setPage(1);
  }, []);

  useEffect(() => {
    fetchAndApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const refresh = useCallback(() => {
    setNotifications(null);
    setHasError(false);
    fetchAndApply();
  }, [fetchAndApply]);

  // Never optimistic: local state only changes once the API call has
  // actually succeeded, so a failure never leaves the UI showing a
  // read-state the backend doesn't agree with (PRD section 10).
  const handleMarkRead = useCallback(
    async (id: string) => {
      const result = await markNotificationRead(id);
      if (!result.ok) return;
      setNotifications((current) => {
        if (!current) return current;
        // Viewing "Unread": a just-read row no longer belongs on this
        // tab, so drop it (and shrink its total) rather than leaving a
        // stale read row in an unread-only list.
        if (filter === "unread") {
          setTotal((t) => Math.max(0, t - 1));
          return current.filter((n) => n.id !== id);
        }
        return current.map((n) => (n.id === id ? result.data : n));
      });
      setUnreadCount((count) => Math.max(0, (count ?? 0) - 1));
    },
    [filter, setUnreadCount],
  );

  const handleMarkAllRead = useCallback(async () => {
    setIsMarkingAllRead(true);
    const result = await markAllNotificationsRead();
    setIsMarkingAllRead(false);
    if (!result.ok) return;
    setUnreadCount(0);
    setPage(1);
    refresh();
  }, [setUnreadCount, refresh]);

  if (notifications === null && !hasError) {
    return <CentreLoadingSkeleton label="Loading your notifications..." />;
  }

  if (hasError) {
    return <ErrorState message="We couldn't load your notifications right now." onRetry={refresh} />;
  }

  const filterCounts: Record<ReadFilter, number> = {
    all: allTotal,
    unread: unreadCount ?? 0,
    read: Math.max(0, allTotal - (unreadCount ?? 0)),
  };

  const visibleNotifications = notifications ?? [];

  return (
    <div className="page-section">
      <div className="page-section-header">
        <h2 className="page-section-title">Your notifications</h2>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={handleMarkAllRead}
          disabled={(unreadCount ?? 0) === 0 || isMarkingAllRead}
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
              onClick={() => handleFilterChange(option.value)}
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
        <div style={{ maxWidth: "28rem", margin: "2.5rem auto" }}>
          <EmptyState
            heading={EMPTY_STATE_COPY[filter].heading}
            description={EMPTY_STATE_COPY[filter].description}
          />
        </div>
      ) : (
        <NotificationList notifications={visibleNotifications} onMarkRead={handleMarkRead} />
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
