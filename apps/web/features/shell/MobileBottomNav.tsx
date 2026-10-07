"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BOTTOM_NAV_ITEMS } from "@/features/shell/navigation";

/** Fixed bottom tab bar for the five real candidate destinations --
 * mobile's primary navigation surface, so getting to Resume/LinkedIn/
 * Interviews never requires opening the hamburger drawer first. The
 * drawer (see AppShell.tsx) still exists for account/admin/logout. */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="app-shell-bottom-nav">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="app-shell-bottom-nav-link"
          >
            <item.icon aria-hidden style={{ width: 22, height: 22 }} />
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
