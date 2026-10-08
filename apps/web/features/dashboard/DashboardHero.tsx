import Link from "next/link";

import { ProgressRing } from "@/components/ProgressRing";
import type { NextAction } from "@/lib/candidate/types";

type DashboardHeroProps = {
  percentage: number;
  action: NextAction;
};

/** The profile-completion hero: eyebrow, heading, explanation, progress
 * ring, and primary CTA. "What should I do next" now lives in its own
 * RecommendedNextStep section (see CandidateDashboardPage) instead of
 * being embedded here, so this hero stays focused on completion/
 * progress alone and doesn't grow tall. */
export function DashboardHero({ percentage, action }: DashboardHeroProps) {
  const isComplete = action.type === "PROFILE_COMPLETE";

  return (
    <section aria-label="Profile completion" className="hero-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", minWidth: 0 }}>
          <p className="hero-eyebrow">Launchpad profile</p>
          <h2 className="hero-title">
            {isComplete ? "Your profile is complete 🎉" : "Complete your Launchpad profile"}
          </h2>
          <p className="hero-subtitle">
            {isComplete
              ? "Great work -- your profile is fully ready for recruiters."
              : "A complete profile helps us understand your background and show you better opportunities."}
          </p>
          {!isComplete && (
            <Link href={action.route} className="btn-primary hero-cta" style={{ marginTop: "1rem" }}>
              Continue to next step →
            </Link>
          )}
        </div>

        <ProgressRing percentage={percentage} label="Profile progress" size={76} />
      </div>
    </section>
  );
}
