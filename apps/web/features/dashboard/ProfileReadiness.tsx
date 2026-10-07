import Link from "next/link";

import { READINESS_ITEMS } from "@/features/dashboard/routes";
import type { ProfileCompletionComponents } from "@/lib/candidate/types";

type ProfileReadinessProps = {
  components: ProfileCompletionComponents;
};

export function ProfileReadiness({ components }: ProfileReadinessProps) {
  const remaining = READINESS_ITEMS.filter((item) => !components[item.key]).length;

  return (
    <section aria-labelledby="profile-readiness-heading" className="card">
      <div className="page-section-header" style={{ marginBottom: "0.25rem" }}>
        <h2 id="profile-readiness-heading">Profile readiness</h2>
        <span className="page-section-hint">
          {remaining === 0 ? "Every section complete" : `${remaining} section${remaining === 1 ? "" : "s"} left`}
        </span>
      </div>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
        {READINESS_ITEMS.map((item) => {
          const isComplete = components[item.key];
          return (
            <li key={item.key} className="section-block" style={{ padding: "0.625rem 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <Link
                  href={item.href}
                  className="sidebar-nav-link"
                  style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 1, padding: "0.25rem 0.5rem", marginLeft: "-0.5rem", borderRadius: "var(--radius-md)" }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      width: "1.125rem",
                      height: "1.125rem",
                      borderRadius: "var(--radius-pill)",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      flexShrink: 0,
                      color: isComplete ? "var(--color-success-text)" : "var(--color-text-muted)",
                      background: isComplete ? "var(--color-success-bg)" : "var(--color-surface-muted)",
                    }}
                  >
                    {isComplete ? "✓" : "○"}
                  </span>
                  <span>{item.label}</span>
                </Link>
                <span className={`badge ${isComplete ? "badge-success" : "badge-neutral"}`}>
                  {isComplete ? "Complete" : "Incomplete"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
