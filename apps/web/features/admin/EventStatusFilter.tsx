import Link from "next/link";

const STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"];

/** Mirrors features/admin/MockInterviewStatusFilter.tsx. */
export function EventStatusFilter({ current }: { current?: string }) {
  return (
    <div role="group" aria-label="Filter by status" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      <Link
        href="/admin/events"
        className={!current ? "btn-primary" : "btn-ghost"}
        style={{ display: "inline-flex" }}
      >
        All
      </Link>
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`/admin/events?status=${status}`}
          className={current === status ? "btn-primary" : "btn-ghost"}
          style={{ display: "inline-flex" }}
        >
          {status}
        </Link>
      ))}
    </div>
  );
}
