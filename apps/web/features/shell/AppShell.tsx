"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { MobileBottomNav } from "@/features/shell/MobileBottomNav";
import { Sidebar } from "@/features/shell/Sidebar";

export function AppShell({
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
      <header className="app-shell-mobile-header">
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-pressed) 100%)",
              color: "var(--color-text-on-primary)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              fontWeight: 700,
            }}
          >
            L
          </span>
          Launchpad
        </span>
        <button
          type="button"
          className="btn-ghost"
          aria-label={isDrawerOpen ? "Close account menu" : "Open account menu"}
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
            <Sidebar email={email} roles={roles} />
          </div>
        </>
      )}

      <aside className="app-shell-sidebar" aria-label="Sidebar">
        <Sidebar email={email} roles={roles} />
      </aside>

      <main className="app-shell-main">{children}</main>

      <MobileBottomNav />
    </div>
  );
}
