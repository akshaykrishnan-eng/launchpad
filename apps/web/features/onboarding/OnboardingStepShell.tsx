"use client";

import type { ReactNode } from "react";

import { BackLink } from "@/components/BackLink";
import { Stepper } from "@/components/Stepper";
import { OnboardingRail } from "@/features/onboarding/OnboardingRail";
import { ONBOARDING_STEPS, OnboardingStepPath, stepNeighbors } from "@/features/onboarding/steps";

type OnboardingStepShellProps = {
  path: OnboardingStepPath;
  title: string;
  description: string;
  children: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  isSubmitting: boolean;
  error: string | null;
  continueLabel?: string;
  /** false for steps whose children already render their own <form>
   * (e.g. Work Experience, which reuses features/profile's
   * WorkExperienceSection/ExperienceForm as-is) -- nested <form>
   * elements are invalid HTML and submit unpredictably, so those
   * steps render a plain container and drive Continue off a click
   * handler instead of form submission. Defaults to true, unchanged
   * for every other existing step. */
  useForm?: boolean;
};

export function OnboardingStepShell({
  path,
  title,
  description,
  children,
  onBack,
  onContinue,
  isSubmitting,
  error,
  continueLabel = "Continue",
  useForm = true,
}: OnboardingStepShellProps) {
  const { index, total } = stepNeighbors(path);

  const body = (
    <>
      {children}

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}

      <div className="onboarding-step-actions">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={isSubmitting}>
          ← Back
        </button>
        <button
          type={useForm ? "submit" : "button"}
          className="btn-primary"
          disabled={isSubmitting}
          onClick={useForm ? undefined : onContinue}
        >
          {isSubmitting ? "Saving..." : `${continueLabel} →`}
        </button>
      </div>
    </>
  );

  return (
    <div className="onboarding-shell">
      <OnboardingRail currentIndex={index} />

      <main className="onboarding-content">
        <div className="onboarding-topbar">
          <BackLink href="/onboarding">Back to profile setup</BackLink>
        </div>

        <div className="onboarding-content-center">
          <div className="onboarding-content-inner">
            <div className="onboarding-mobile-stepper">
              <Stepper steps={ONBOARDING_STEPS} currentIndex={index} />
            </div>

            <header className="onboarding-step-header">
              <p className="step-eyebrow onboarding-step-eyebrow-desktop">
                Step {index + 1} of {total}
              </p>
              <h1>{title}</h1>
              <p className="onboarding-step-description">{description}</p>
            </header>

            {useForm ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onContinue();
                }}
                className="onboarding-step-form"
              >
                {body}
              </form>
            ) : (
              <div className="onboarding-step-form">{body}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
