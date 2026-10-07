import { ONBOARDING_STEPS } from "@/features/onboarding/steps";

type StepState = "complete" | "current" | "upcoming";

const CAPTIONS: Record<StepState, string> = {
  complete: "Completed",
  current: "Current step",
  upcoming: "",
};

/** Desktop-only wayfinding rail for the guided onboarding flow: every
 * step, with the current one highlighted and earlier ones marked done.
 * Index-based "done" (same assumption the mobile Stepper already made)
 * -- this is wayfinding, not a second source of truth for completion. */
export function OnboardingRail({ currentIndex }: { currentIndex: number }) {
  return (
    <aside className="onboarding-rail" aria-hidden="true">
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontWeight: 700, fontSize: "1.0625rem" }}>
        <span
          style={{
            display: "inline-flex",
            width: "2rem",
            height: "2rem",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-pressed) 100%)",
            color: "var(--color-text-on-primary)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          L
        </span>
        Launchpad
      </div>

      <h2 style={{ fontSize: "1.3125rem", marginTop: "1.75rem" }}>Build your Launchpad profile</h2>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "0.375rem" }}>
        A few short steps. You can save and come back any time.
      </p>

      <ol className="onboarding-rail-steps">
        {ONBOARDING_STEPS.map((step, index) => {
          const state: StepState = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          const caption = CAPTIONS[state];
          return (
            <li key={step.path} className="onboarding-rail-step" data-state={state}>
              <span className="onboarding-rail-step-marker">{state === "complete" ? "✓" : index + 1}</span>
              <span className="onboarding-rail-step-text">
                <span className="onboarding-rail-step-label">{step.label}</span>
                {caption && <span className="onboarding-rail-step-caption">{caption}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="onboarding-rail-footer">Your answers are saved automatically as you go.</p>
    </aside>
  );
}
