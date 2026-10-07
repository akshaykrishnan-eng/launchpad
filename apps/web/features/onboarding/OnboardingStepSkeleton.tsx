import { Skeleton } from "@/components/Skeleton";

/** The loading state shared by every onboarding step while its
 * existing data loads -- previously five identical copies of a plain
 * "Loading..." line, one per step file. Mirrors OnboardingStepShell's
 * topbar/rail/centered-content structure so there's no layout jump
 * once the real step renders. */
export function OnboardingStepSkeleton() {
  return (
    <div className="onboarding-shell">
      <div className="onboarding-rail" aria-hidden="true" />
      <main className="onboarding-content">
        <div className="onboarding-topbar">
          <Skeleton width="10rem" height="0.875rem" />
        </div>
        <div className="onboarding-content-center">
          <div className="onboarding-content-inner">
            <span className="visually-hidden" role="status">
              Loading...
            </span>
            <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              <Skeleton width="30%" height="0.75rem" />
              <Skeleton width="55%" height="1.75rem" />
              <Skeleton width="100%" height="2.5rem" />
              <Skeleton width="100%" height="2.5rem" />
              <Skeleton width="60%" height="2.5rem" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
