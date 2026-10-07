"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  MenuIcon,
  ProfileIcon,
  SearchIcon,
} from "@/components/icons";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { NotificationBadge } from "@/features/notifications/NotificationBadge";
import { getProfile } from "@/lib/candidate/client";
import type { CandidateProfile } from "@/lib/candidate/types";

type TopBarProps = {
  email: string | null;
  /** Shared with the sidebar's badge via AppShell -- see
   * NotificationBadge's `unreadCount` prop. */
  unreadCount: number | null;
  /** Opens the mobile drawer (the existing hamburger menu in
   * AppShell) -- the top bar's own menu button only renders below
   * 1024px, where the sidebar isn't otherwise reachable. */
  onOpenMobileMenu: () => void;
};

/** The global candidate top bar (search placeholder + notification
 * bell + profile menu), sticky above the main content on every
 * authenticated candidate page. Not duplicated per page -- rendered
 * once by AppShell. */
export function TopBar({ email, unreadCount, onOpenMobileMenu }: TopBarProps) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Candidate name for the identity area -- the authenticated session
  // (lib/auth/session) only carries email/roles, so the display name
  // comes from the existing candidate-profile endpoint, same data
  // ProfileHeader already renders from. Fetched once on mount, same
  // freshness model as NotificationBadge.
  useEffect(() => {
    getProfile().then((result) => {
      if (result.ok) setProfile(result.data);
    });
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const fullName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : null;
  const displayName = fullName ?? email ?? "Account";
  const initials = fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : email
      ? (email.trim()[0]?.toUpperCase() ?? "?")
      : "?";

  return (
    <header className="app-topbar">
      <button
        type="button"
        className="btn-ghost app-topbar-menu-trigger"
        aria-label="Open navigation menu"
        onClick={onOpenMobileMenu}
      >
        <MenuIcon aria-hidden />
      </button>

      <div className="app-topbar-search">
        <SearchIcon aria-hidden className="app-topbar-search-icon" />
        <input
          type="search"
          placeholder="Search anything..."
          aria-label="Search"
          className="app-topbar-search-input"
        />
      </div>

      <div className="app-topbar-actions">
        <Link href="/app/notifications" className="app-topbar-bell" aria-label="Notifications">
          <BellIcon aria-hidden />
          <span className="app-topbar-bell-badge">
            <NotificationBadge unreadCount={unreadCount} />
          </span>
        </Link>

        <div className="app-topbar-user" ref={menuRef}>
          <button
            type="button"
            className="app-topbar-user-trigger"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <span className="avatar app-topbar-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="app-topbar-user-text">
              <span className="app-topbar-user-name">{displayName}</span>
              <span className="app-topbar-user-role">Candidate</span>
            </span>
            <ChevronDownIcon aria-hidden style={{ flexShrink: 0 }} />
          </button>

          {isMenuOpen && (
            <div className="app-topbar-menu" aria-label="Account menu">
              <Link
                href="/app/profile"
                className="app-topbar-menu-item"
                onClick={() => setIsMenuOpen(false)}
              >
                <ProfileIcon aria-hidden />
                Profile
              </Link>
              <LogoutButton className="app-topbar-menu-item app-topbar-menu-item-danger">
                <LogoutIcon aria-hidden />
                Log out
              </LogoutButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
