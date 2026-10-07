import Link from "next/link";
import type { ComponentType } from "react";

import { ChevronRightIcon, type IconProps } from "@/components/icons";

type ModuleSummaryCardProps = {
  href: string;
  icon: ComponentType<IconProps>;
  title: string;
  status: string;
};

/** The clickable "icon + title + status" career-tool tile shared by the
 * Resume/LinkedIn/Mock Interview dashboard cards -- previously three
 * near-identical copies differing only in icon/title/status. */
export function ModuleSummaryCard({ href, icon: Icon, title, status }: ModuleSummaryCardProps) {
  return (
    <Link
      href={href}
      className="card card-clickable"
      style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "1.125rem 1.25rem" }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          flexShrink: 0,
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "var(--radius-md)",
          background: "var(--color-primary-subtle)",
          color: "var(--color-primary-hover)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon aria-hidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: "1rem" }}>{title}</h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.125rem" }}>{status}</p>
      </div>
      <ChevronRightIcon aria-hidden style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
    </Link>
  );
}
