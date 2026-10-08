import Link from "next/link";

import { ProfileIcon } from "@/components/icons";
import type { NextAction } from "@/lib/candidate/types";

type RecommendedNextStepProps = {
  action: NextAction;
};

/** "What should I do next", split out of the profile hero into its own
 * scannable card (see DashboardHero, which used to render this inline).
 * Renders dashboard.next_action verbatim -- the backend's deterministic
 * next-action logic remains the only source of truth for which step
 * this is, so there's no second recommendation engine here. Callers
 * skip rendering this entirely once profile_completion reaches
 * PROFILE_COMPLETE, since there's no onboarding action left to
 * recommend. */
export function RecommendedNextStep({ action }: RecommendedNextStepProps) {
  return (
    <section aria-labelledby="recommended-next-step-heading" className="page-section">
      <div className="page-section-header" style={{ marginBottom: "0.75rem" }}>
        <h2 id="recommended-next-step-heading" className="page-section-title">
          Recommended next step
        </h2>
      </div>
      <div
        className="callout"
        style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            flexShrink: 0,
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary-subtle)",
            color: "var(--color-primary-hover)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ProfileIcon aria-hidden />
        </span>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h3 style={{ fontSize: "1.0625rem" }}>{action.title}</h3>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            {action.description}
          </p>
        </div>
        <Link href={action.route} className="btn-primary" style={{ flexShrink: 0 }}>
          Continue now →
        </Link>
      </div>
    </section>
  );
}
