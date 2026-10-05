"use client";

import type { ReactNode } from "react";

import { OnboardingStepPath, stepNeighbors } from "@/features/onboarding/steps";

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
  continueLabel = "Save & Continue",
}: OnboardingStepShellProps) {
  const { index, total } = stepNeighbors(path);

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <p style={{ opacity: 0.6, fontSize: "0.875rem" }}>
          Step {index + 1} of {total}
        </p>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h1>
          <p style={{ opacity: 0.75 }}>{description}</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onContinue();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {children}

          {error && <p role="alert">{error}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <button type="button" onClick={onBack} disabled={isSubmitting}>
              Back
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : continueLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
