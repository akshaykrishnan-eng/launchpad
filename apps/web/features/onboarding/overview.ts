import { ONBOARDING_STEPS, OnboardingStepPath } from "@/features/onboarding/steps";
import type { NextAction, ProfileCompletionComponents } from "@/lib/candidate/types";

type StepState = "complete" | "current" | "upcoming";

export type OnboardingJourneyStep = {
  path: OnboardingStepPath;
  label: string;
  state: StepState;
};

export type OnboardingJourney = {
  steps: OnboardingJourneyStep[];
  currentIndex: number;
};

/** Which profile-completion component each of the five onboarding
 * steps corresponds to. Work experience is deliberately excluded --
 * it's edited on the profile page, not as part of this guided flow. */
const STEP_COMPONENT_KEYS: Record<OnboardingStepPath, keyof ProfileCompletionComponents> = {
  "/onboarding/about": "personal_information",
  "/onboarding/education": "education",
  "/onboarding/skills": "skills",
  "/onboarding/career": "career_preferences",
  "/onboarding/goal": "career_goal",
};

/** Builds the five-step journey purely from the backend's completion
 * booleans -- no recalculated percentage, no invented state. The first
 * incomplete step (in onboarding order) is "current"; everything
 * before it is "complete", everything after is "upcoming". -1 means
 * every onboarding step is already done. */
export function buildOnboardingJourney(components: ProfileCompletionComponents): OnboardingJourney {
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => !components[STEP_COMPONENT_KEYS[step.path]],
  );

  const steps = ONBOARDING_STEPS.map((step, index) => ({
    path: step.path,
    label: step.label,
    state: (currentIndex === -1 || index < currentIndex
      ? "complete"
      : index === currentIndex
        ? "current"
        : "upcoming") as StepState,
  }));

  return { steps, currentIndex };
}

export type NextStepPanel = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

/** Picks the copy/CTA for the "what do I do next" panel. Reuses the
 * backend's own next-action text when it already describes the same
 * step this journey says is current; falls back to a short generic
 * line when the backend's next action is work experience (a field
 * this five-step flow doesn't cover) while an onboarding step is
 * still genuinely next. */
export function buildNextStepPanel(journey: OnboardingJourney, nextAction: NextAction): NextStepPanel {
  const { steps, currentIndex } = journey;

  if (currentIndex === -1) {
    const isFullyComplete = nextAction.type === "PROFILE_COMPLETE";
    return {
      eyebrow: isFullyComplete ? "All done" : "Almost there",
      title: nextAction.title,
      description: nextAction.description,
      ctaLabel: isFullyComplete ? "View your profile →" : "Go to your profile →",
      ctaHref: nextAction.route,
    };
  }

  const current = steps[currentIndex];
  const backendDescribesCurrentStep = nextAction.route === current.path;

  return {
    eyebrow: "Next step",
    title: backendDescribesCurrentStep ? nextAction.title : current.label,
    description: backendDescribesCurrentStep
      ? nextAction.description
      : `Continue building your profile with ${current.label}.`,
    ctaLabel: `Continue to ${current.label} →`,
    ctaHref: current.path,
  };
}

export type PostOnboardingRecommendationType = "RESUME" | "LINKEDIN" | "INTERVIEW" | "DASHBOARD";

export type PostOnboardingRecommendation = {
  type: PostOnboardingRecommendationType;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

/** Once onboarding itself is finished, picks the single most useful
 * next action from the candidate's real product state -- resume,
 * then LinkedIn, then a mock interview (while the candidate still has
 * interview credits to spend), then the dashboard once nothing else
 * is actionable. Deliberately simple and frontend-only: it only reads
 * state the completion page already has to fetch (resume/LinkedIn
 * existence, mock-interview credit balance -- the same balance the
 * main dashboard already fetches), it doesn't recompute profile
 * completion or duplicate any backend next-action logic. */
export function buildPostOnboardingRecommendation(
  hasResume: boolean,
  hasLinkedIn: boolean,
  hasMockInterviewCredits: boolean,
): PostOnboardingRecommendation {
  if (!hasResume) {
    return {
      type: "RESUME",
      title: "Upload your resume",
      description: "Your resume is the next important part of your Launchpad profile.",
      ctaLabel: "Upload resume →",
      ctaHref: "/app/resume",
    };
  }

  if (!hasLinkedIn) {
    return {
      type: "LINKEDIN",
      title: "Add your LinkedIn profile",
      description: "Complete your professional presence by connecting your LinkedIn profile.",
      ctaLabel: "Add LinkedIn →",
      ctaHref: "/app/linkedin",
    };
  }

  if (hasMockInterviewCredits) {
    return {
      type: "INTERVIEW",
      title: "Prepare for your next interview",
      description: "Practice with a mock interview and turn feedback into improvement.",
      ctaLabel: "Book an interview →",
      ctaHref: "/app/mock-interviews",
    };
  }

  return {
    type: "DASHBOARD",
    title: "Explore your Launchpad dashboard",
    description: "Your profile is ready. Explore your career tools and opportunities.",
    ctaLabel: "Go to Dashboard →",
    ctaHref: "/app",
  };
}
