type SkeletonProps = {
  width?: string;
  height?: string;
};

/** A single shimmering placeholder block (see .skeleton in globals.css).
 * Composed into page-specific skeletons rather than one big generic
 * "page skeleton" component, since each loading state has a different
 * real shape to hint at. */
export function Skeleton({ width = "100%", height = "1rem" }: SkeletonProps) {
  return <div className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Skeleton width="40%" height="0.875rem" />
      <Skeleton width="70%" height="1.5rem" />
      <Skeleton width="55%" height="0.875rem" />
    </div>
  );
}

export function CentreLoadingSkeleton({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <span className="visually-hidden" role="status">
        {label}
      </span>
      <div
        aria-hidden="true"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}
      >
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="card" aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Skeleton width="30%" height="1.125rem" />
        <Skeleton width="90%" />
        <Skeleton width="80%" />
      </div>
    </div>
  );
}
