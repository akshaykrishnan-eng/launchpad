import Link from "next/link";

const STATUSES = ["BOOKED", "COMPLETED", "CANCELLED"];

/** Mock interview statuses differ from the review lifecycle
 * features/admin/StatusFilter.tsx covers, so this is its own small
 * filter rather than a shared one. */
export function MockInterviewStatusFilter({ current }: { current?: string }) {
  return (
    <div role="group" aria-label="Filter by status" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      <Link
        href="/admin/mock-interviews"
        className={!current ? "btn-primary" : "btn-ghost"}
        style={{ display: "inline-flex" }}
      >
        All
      </Link>
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`/admin/mock-interviews?status=${status}`}
          className={current === status ? "btn-primary" : "btn-ghost"}
          style={{ display: "inline-flex" }}
        >
          {status}
        </Link>
      ))}
    </div>
  );
}
