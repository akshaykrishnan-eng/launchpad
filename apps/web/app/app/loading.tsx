import { CardSkeleton, Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="page">
      <span className="visually-hidden" role="status">
        Loading your dashboard...
      </span>
      <div
        aria-hidden="true"
        className="hero-panel"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <Skeleton width="30%" height="0.875rem" />
        <Skeleton width="55%" height="1.75rem" />
        <Skeleton width="45%" height="1rem" />
      </div>
      <div aria-hidden="true" className="card">
        <Skeleton width="35%" height="1.125rem" />
        <div style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <Skeleton height="1.5rem" />
          <Skeleton height="1.5rem" />
          <Skeleton height="1.5rem" />
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}
      >
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
