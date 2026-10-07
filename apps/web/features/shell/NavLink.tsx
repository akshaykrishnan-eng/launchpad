"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { NavItem } from "@/features/shell/navigation";

export function NavLink({ href, label, icon: Icon, badge }: NavItem & { badge?: ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="sidebar-nav-link"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0.75rem 0.5rem 1rem",
        borderRadius: "var(--radius-md)",
        fontSize: "0.9375rem",
        fontWeight: isActive ? 600 : 500,
        // --color-primary-hover, not --color-primary: see the contrast
        // note in globals.css -- the raw brand blue is ~3.9:1 as text on
        // this pill's tinted background, under the 4.5:1 AA threshold.
        color: isActive ? "var(--color-primary-hover)" : "var(--color-text-secondary)",
        ...(isActive ? { background: "var(--color-primary-subtle)" } : {}),
      }}
    >
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: "0.3125rem",
            bottom: "0.3125rem",
            width: "3px",
            borderRadius: "var(--radius-pill)",
            background: "var(--color-primary)",
          }}
        />
      )}
      <Icon aria-hidden style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge}
    </Link>
  );
}
