import Link from "next/link";

import { LogoutButton } from "@/features/auth/LogoutButton";
import { LogoutIcon } from "@/components/icons";
import { NotificationBadge } from "@/features/notifications/NotificationBadge";
import { NavLink } from "@/features/shell/NavLink";
import {
  ADMIN_LINK_ITEM,
  CAREER_TOOLS_NAV_ITEMS,
  NOTIFICATIONS_NAV_HREF,
  OVERVIEW_NAV_ITEMS,
} from "@/features/shell/navigation";
import { isAdminUser } from "@/lib/auth/roles";

export function Sidebar({ email, roles }: { email: string | null; roles: string[] }) {
  const isAdmin = isAdminUser({ roles });
  const initial = email ? email.trim()[0]?.toUpperCase() : "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.5rem 1rem 1.25rem" }}>
      <Link
        href="/app"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          padding: "0.25rem 0.75rem",
          marginBottom: "1.75rem",
          fontSize: "1.1875rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            width: "2rem",
            height: "2rem",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-pressed) 100%)",
            color: "var(--color-text-on-primary)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          L
        </span>
        Launchpad
      </Link>

      <nav aria-label="Main navigation" style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {OVERVIEW_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <p className="nav-group-label">Career tools</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {CAREER_TOOLS_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              badge={item.href === NOTIFICATIONS_NAV_HREF ? <NotificationBadge /> : undefined}
            />
          ))}
        </div>

        {isAdmin && (
          <>
            <p className="nav-group-label">Administration</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <NavLink {...ADMIN_LINK_ITEM} />
            </div>
          </>
        )}
      </nav>

      <div
        style={{
          borderTop: "1px solid var(--color-border-subtle)",
          marginTop: "1rem",
          paddingTop: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        <span className="avatar" style={{ width: "2.125rem", height: "2.125rem", fontSize: "0.875rem" }} aria-hidden="true">
          {initial}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {email && (
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={email}
            >
              {email}
            </p>
          )}
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Candidate</p>
        </div>
        <LogoutButton
          className="btn-ghost btn-sm"
          aria-label="Log out"
          style={{ flexShrink: 0, padding: "0 0.5rem" }}
        >
          <LogoutIcon aria-hidden />
        </LogoutButton>
      </div>
    </div>
  );
}
