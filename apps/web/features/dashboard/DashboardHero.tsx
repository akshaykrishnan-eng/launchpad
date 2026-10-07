import Link from "next/link";

import { ProgressRing } from "@/components/ProgressRing";
import type { NextAction } from "@/lib/candidate/types";

type DashboardHeroProps = {
  firstName: string | null;
  percentage: number;
  action: NextAction;
};

/** The dashboard's command-centre banner: "where am I" (greeting +
 * readiness ring) and "what should I do next" (the action the backend's
 * deterministic next-action logic already picked), merged into one
 * brand-forward surface instead of two separate flat cards. */
export function DashboardHero({ firstName, percentage, action }: DashboardHeroProps) {
  const isComplete = action.type === "PROFILE_COMPLETE";

  return (
    <section aria-label="Career readiness overview" className="hero-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <p className="hero-eyebrow">Career dashboard</p>
          <h1 className="hero-title">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="hero-subtitle">
            {isComplete
              ? "Your profile is fully ready for recruiters."
              : `Your career journey is ${percentage}% ready.`}
          </p>
        </div>

        <ProgressRing percentage={percentage} label="Profile completion" size={76} />
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          background: "rgba(255, 255, 255, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(255,255,255,0.75)" }}>
            {isComplete ? "All done" : "Next step"}
          </p>
          <p style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#fff", marginTop: "0.125rem" }}>{action.title}</p>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9375rem", marginTop: "0.125rem" }}>{action.description}</p>
        </div>
        {!isComplete && (
          <Link href={action.route} className="btn-primary hero-cta" style={{ flexShrink: 0 }}>
            Go now →
          </Link>
        )}
      </div>
    </section>
  );
}
