import Link from "next/link";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  extraParams?: Record<string, string>;
};

/** Plain links (no client JS needed) that adjust ?page=, preserving
 * any other query params (search, status filter, ...) already active
 * on the page -- server-side pagination throughout, per PRD section 13. */
export function Pagination({ page, pageSize, total, basePath, extraParams = {} }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams(extraParams);
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}
    >
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
        Page {page} of {totalPages} · {total} total
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="btn-ghost btn-sm" style={{ display: "inline-flex" }}>
            Previous
          </Link>
        ) : (
          <button type="button" className="btn-sm" disabled>
            Previous
          </button>
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className="btn-ghost btn-sm" style={{ display: "inline-flex" }}>
            Next
          </Link>
        ) : (
          <button type="button" className="btn-sm" disabled>
            Next
          </button>
        )}
      </div>
    </nav>
  );
}
