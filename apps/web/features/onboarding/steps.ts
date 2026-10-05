export const ONBOARDING_STEPS = [
  { path: "/onboarding/about", label: "About You" },
  { path: "/onboarding/education", label: "Education" },
  { path: "/onboarding/skills", label: "Skills" },
  { path: "/onboarding/career", label: "Career Interests" },
  { path: "/onboarding/goal", label: "Career Goal" },
] as const;

export type OnboardingStepPath = (typeof ONBOARDING_STEPS)[number]["path"];

export function stepNeighbors(path: OnboardingStepPath) {
  const index = ONBOARDING_STEPS.findIndex((step) => step.path === path);
  return {
    index,
    total: ONBOARDING_STEPS.length,
    previousPath: index > 0 ? ONBOARDING_STEPS[index - 1].path : "/onboarding",
    nextPath: index < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[index + 1].path : "/onboarding",
  };
}
