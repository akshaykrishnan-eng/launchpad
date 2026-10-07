import Link from "next/link";

import type { OnboardingJourneyStep } from "@/features/onboarding/overview";

const STATE_CAPTIONS: Record<OnboardingJourneyStep["state"], string> = {
  complete: "Completed",
  current: "Your next step",
  upcoming: "Up next",
};

const STATE_MARKERS: Record<OnboardingJourneyStep["state"], string> = {
  complete: "✓",
  current: "→",
  upcoming: "○",
};

/** The five-step onboarding journey as an actual wayfinding stepper --
 * horizontal with a connecting line at desktop widths, a vertical list
 * on narrow screens (see .onboarding-journey* in globals.css) -- instead
 * of a plain numbered list. Each step stays a real link so a candidate
 * can still jump straight to any step. */
export function OnboardingJourney({ steps }: { steps: OnboardingJourneyStep[] }) {
  return (
    <ol className="onboarding-journey">
      {steps.map((step) => (
        <li key={step.path} className="onboarding-journey-step" data-state={step.state}>
          <Link href={step.path} className="onboarding-journey-step-link">
            <span className="onboarding-journey-marker" aria-hidden="true">
              {STATE_MARKERS[step.state]}
            </span>
            <span className="onboarding-journey-step-text">
              <span className="onboarding-journey-step-label">{step.label}</span>
              <span className="onboarding-journey-step-caption">{STATE_CAPTIONS[step.state]}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
