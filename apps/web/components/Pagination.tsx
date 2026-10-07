type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** Client-side counterpart to features/admin/Pagination.tsx's link-
 * based control: candidate history pages are client components (same
 * fetch-on-mount pattern as every other *Centre), so page changes are
 * a callback + refetch rather than a ?page= link. Same shape/behavior
 * otherwise -- hidden entirely when everything already fits on one
 * page, Previous/Next disabled at the ends rather than removed, so
 * focus never jumps unexpectedly. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}
    >
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
        Page {page} of {totalPages} · {total} total
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
