"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { getUnreadNotificationCount } from "@/lib/notifications/client";

type NotificationCountContextValue = {
  unreadCount: number | null;
  setUnreadCount: Dispatch<SetStateAction<number | null>>;
  refreshUnreadCount: () => void;
};

const NotificationCountContext = createContext<NotificationCountContextValue | null>(null);

/** The single shared source of the candidate's unread count -- the
 * sidebar badge, the top bar bell, and the Notifications page all read
 * and write through this one context instead of each tracking their
 * own copy, so a mark-read/mark-all-read action is reflected everywhere
 * at once rather than only in the component that triggered it. */
export function NotificationCountProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refreshUnreadCount = useCallback(() => {
    getUnreadNotificationCount().then((result) => {
      if (result.ok) setUnreadCount(result.data.unread_count);
    });
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <NotificationCountContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount() {
  const ctx = useContext(NotificationCountContext);
  if (!ctx) {
    throw new Error("useNotificationCount must be used within a NotificationCountProvider");
  }
  return ctx;
}
