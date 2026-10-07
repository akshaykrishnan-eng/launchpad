"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { MobileBottomNav } from "@/features/shell/MobileBottomNav";
import { Sidebar } from "@/features/shell/Sidebar";
import { TopBar } from "@/features/shell/TopBar";
import {
  NotificationCountProvider,
  useNotificationCount,
} from "@/features/notifications/NotificationCountContext";

export function AppShell(props: { email: string | null; roles: string[]; children: ReactNode }) {
  return (
    <NotificationCountProvider>
      <AppShellContent {...props} />
    </NotificationCountProvider>
  );
}

function AppShellContent({
  email,
  roles,
  children,
}: {
  email: string | null;
  roles: string[];
  children: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Shared with both the sidebar's nav badge and the top bar's bell
  // (and with the Notifications page) via NotificationCountContext,
  // instead of each fetching/tracking its own count independently --
  // see NotificationBadge's `unreadCount` prop.
  const { unreadCount } = useNotificationCount();

  // Close the mobile drawer automatically on navigation. Adjusting
  // state during render (the React-recommended pattern for "reset
  // state when a prop changes") rather than in an effect, so there's
  // no extra render pass and no synchronous setState-in-effect.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsDrawerOpen(false);
  }

  useEffect(() => {
    if (!isDrawerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100%" }}>
      {isDrawerOpen && (
        <>
          <div
            className="app-shell-drawer-backdrop"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="app-shell-drawer" role="dialog" aria-modal="true" aria-label="Account menu">
            <button
              type="button"
              className="btn-ghost"
              aria-label="Close navigation menu"
              onClick={() => setIsDrawerOpen(false)}
              style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}
            >
              <CloseIcon aria-hidden />
            </button>
            <Sidebar email={email} roles={roles} unreadCount={unreadCount} />
          </div>
        </>
      )}

      <aside className="app-shell-sidebar" aria-label="Sidebar">
        <Sidebar email={email} roles={roles} unreadCount={unreadCount} />
      </aside>

      <div className="app-shell-content">
        <TopBar
          email={email}
          unreadCount={unreadCount}
          onOpenMobileMenu={() => setIsDrawerOpen(true)}
        />
        <main className="app-shell-main">{children}</main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
