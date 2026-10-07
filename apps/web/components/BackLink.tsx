import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";

type BackLinkProps = {
  href: string;
  children: React.ReactNode;
};

/** A small "← Back to X" link for secondary pages that were reached
 * from somewhere other than the sidebar (e.g. a detail view). Not used
 * where browser/in-app navigation already lands you back in one step. */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
        marginBottom: "0.875rem",
      }}
    >
      <ChevronRightIcon aria-hidden style={{ transform: "rotate(180deg)", width: "1rem", height: "1rem" }} />
      {children}
    </Link>
  );
}
