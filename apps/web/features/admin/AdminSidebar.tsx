import Link from "next/link";

import { LogoutIcon } from "@/components/icons";
import { AdminNavLink } from "@/features/admin/AdminNavLink";
import { ADMIN_NAV_ITEMS } from "@/features/admin/navigation";
import { LogoutButton } from "@/features/auth/LogoutButton";

export function AdminSidebar({ email }: { email: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.25rem 1rem" }}>
      <Link
        href="/admin"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.5rem",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-primary)",
            color: "var(--color-text-on-primary)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9375rem",
            fontWeight: 700,
          }}
        >
          L
        </span>
        Launchpad
      </Link>

      {/* The "visually obvious administrative area" indicator (PRD
          section 8) -- a small badge under the brand mark, not a whole
          separate visual language. */}
      <div style={{ padding: "0 0.75rem", marginBottom: "1.25rem" }}>
        <span className="badge badge-info">Admin</span>
      </div>

      <nav aria-label="Admin navigation" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
        {ADMIN_NAV_ITEMS.map((item) => (
          <AdminNavLink key={item.href} {...item} />
        ))}
      </nav>

      <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link
          href="/app"
          className="sidebar-nav-link"
          style={{ padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}
        >
          ← Back to candidate app
        </Link>
        {email && (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", padding: "0 0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email}
          </p>
        )}
        <LogoutButton
          className="sidebar-nav-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: "flex-start",
            width: "100%",
            height: "auto",
            padding: "0.5rem 0.75rem 0.5rem 1rem",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary)",
            fontWeight: 500,
          }}
        >
          <LogoutIcon aria-hidden />
          Log out
        </LogoutButton>
      </div>
    </div>
  );
}
