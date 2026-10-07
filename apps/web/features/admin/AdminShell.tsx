"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { AdminSidebar } from "@/features/admin/AdminSidebar";

export function AdminShell({ email, children }: { email: string | null; children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // See features/shell/AppShell.tsx for why this adjusts state during
  // render rather than in an effect.
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
      <header className="app-shell-mobile-header">
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>Launchpad</span>
          <span className="badge badge-info">Admin</span>
        </span>
        <button
          type="button"
          className="btn-ghost"
          aria-label={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen((open) => !open)}
        >
          <MenuIcon aria-hidden />
        </button>
      </header>

      {isDrawerOpen && (
        <>
          <div
            className="app-shell-drawer-backdrop"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="app-shell-drawer" role="dialog" aria-modal="true" aria-label="Admin navigation menu">
            <button
              type="button"
              className="btn-ghost"
              aria-label="Close navigation menu"
              onClick={() => setIsDrawerOpen(false)}
              style={{ position: "absolute", top: "0.75rem", right: "0.75rem" }}
            >
              <CloseIcon aria-hidden />
            </button>
            <AdminSidebar email={email} />
          </div>
        </>
      )}

      <aside className="app-shell-sidebar" aria-label="Admin sidebar">
        <AdminSidebar email={email} />
      </aside>

      <main className="app-shell-main">{children}</main>
    </div>
  );
}
