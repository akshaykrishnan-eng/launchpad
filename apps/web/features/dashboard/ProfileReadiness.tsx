import Link from "next/link";

import { READINESS_ITEMS } from "@/features/dashboard/routes";
import type { ProfileCompletionComponents } from "@/lib/candidate/types";

type ProfileReadinessProps = {
  components: ProfileCompletionComponents;
};

export function ProfileReadiness({ components }: ProfileReadinessProps) {
  return (
    <section
      aria-labelledby="profile-readiness-heading"
      style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem" }}
    >
      <h2 id="profile-readiness-heading" style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Profile Readiness
      </h2>

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {READINESS_ITEMS.map((item) => {
          const isComplete = components[item.key];
          return (
            <li key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <Link
                href={item.href}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}
              >
                <span aria-hidden="true">{isComplete ? "✓" : "○"}</span>
                <span>{item.label}</span>
              </Link>
              <span style={{ fontSize: "0.875rem", opacity: 0.75 }}>
                {isComplete ? "Complete" : "Incomplete"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
