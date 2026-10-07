import Link from "next/link";

const STATUSES = ["REQUESTED", "IN_REVIEW", "COMPLETED"];

/** Plain links (no client JS) toggling ?status= -- PRD section 38:
 * "Keep filters useful and small." */
export function StatusFilter({ basePath, current }: { basePath: string; current?: string }) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}
    >
      <Link href={basePath} className={!current ? "btn-primary" : "btn-ghost"} style={{ display: "inline-flex" }}>
        All
      </Link>
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`${basePath}?status=${status}`}
          className={current === status ? "btn-primary" : "btn-ghost"}
          style={{ display: "inline-flex" }}
          aria-current={current === status ? "true" : undefined}
        >
          {status.replace("_", " ")}
        </Link>
      ))}
    </div>
  );
}
