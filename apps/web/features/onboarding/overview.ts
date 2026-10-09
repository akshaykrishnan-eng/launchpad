import { ONBOARDING_STEPS, type OnboardingStepPath } from "@/features/onboarding/steps";
import type { NextAction, ProfileCompletionComponents } from "@/lib/candidate/types";

type StepState = "complete" | "current" | "upcoming";

// Maps each onboarding step path to the corresponding key in
// ProfileCompletionComponents so individual step completion is derived
// from the backend's actual data rather than positional order.
const STEP_COMPONENT_KEYS: Record<OnboardingStepPath, keyof ProfileCompletionComponents> = {
  "/onboarding/about": "personal_information",
  "/onboarding/education": "education",
  "/onboarding/skills": "skills",
  "/onboarding/experience": "experience",
  "/onboarding/career": "career_preferences",
  "/onboarding/goal": "career_goal",
};

const EXPERIENCE_STEP_INDEX = ONBOARDING_STEPS.findIndex(
  (s) => s.path === "/onboarding/experience",
);

export type OnboardingJourneyStep = {
  path: OnboardingStepPath;
  label: string;
  state: StepState;
};

export type OnboardingJourney = {
  steps: OnboardingJourneyStep[];
  currentIndex: number;
};

/** Builds the onboarding journey using the backend's data as the sole
 * authoritative source.  next_action.route determines which step is
 * "current"; ProfileCompletionComponents determines which individual
 * steps are actually done.  Using components (rather than purely
 * positional logic) means a later step that has already been saved —
 * e.g. Career Goal completed while Career Interests is still pending —
 * is shown as "complete" rather than "upcoming".
 *
 * Work Experience is optional: when not complete but next_action has
 * already moved past it (currentIndex > EXPERIENCE_STEP_INDEX), the
 * candidate consciously skipped it and the step is shown as resolved.
 *
 * currentIndex === -1 means PROFILE_COMPLETE (next_action.route points
 * to a non-step path like "/app/profile"). */
export function buildOnboardingJourney(
  components: ProfileCompletionComponents,
  nextAction: NextAction,
): OnboardingJourney {
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.path === nextAction.route,
  );

  const steps = ONBOARDING_STEPS.map((step, index) => {
    const done = components[STEP_COMPONENT_KEYS[step.path]];

    let state: StepState;
    if (currentIndex === -1) {
      // PROFILE_COMPLETE: all required sections satisfied by definition.
      state = "complete";
    } else if (done) {
      // The backend's actual component data says this section is done —
      // mark complete regardless of whether it falls before or after
      // the current step in the list.
      state = "complete";
    } else if (step.path === nextAction.route) {
      state = "current";
    } else if (index === EXPERIENCE_STEP_INDEX && currentIndex > EXPERIENCE_STEP_INDEX) {
      // Work Experience: no entries, but the candidate has already moved
      // past it (next action is Career Interests or later) — skipped.
      state = "complete";
    } else {
      state = "upcoming";
    }

    return { path: step.path, label: step.label, state };
  });

  return { steps, currentIndex };
}

export type BenefitRow = {
  /** Key into the ICON_MAP in page.tsx so rendering stays in one place. */
  icon: "profile" | "graduation" | "star" | "target" | "briefcase" | "building" | "rocket" | "sparkle" | "search";
  heading: string;
  description: string;
};

export type NextStepPanel = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  benefits: BenefitRow[];
};

const STEP_BENEFITS: Record<OnboardingStepPath, BenefitRow[]> = {
  "/onboarding/about": [
    { icon: "profile", heading: "Build your Launchpad profile", description: "Help us understand who you are and where you're starting from." },
    { icon: "sparkle", heading: "Keep your information current", description: "Your profile can be updated anytime." },
    { icon: "rocket", heading: "Takes just a minute", description: "We'll have you set up quickly so you can explore Launchpad." },
  ],
  "/onboarding/education": [
    { icon: "graduation", heading: "Add your degree details", description: "Include your college, degree and graduation year." },
    { icon: "target", heading: "Help us match better opportunities", description: "We'll suggest jobs and resources based on your education." },
    { icon: "sparkle", heading: "Takes just a minute", description: "You can always update your education details later." },
  ],
  "/onboarding/skills": [
    { icon: "star", heading: "Highlight your strengths", description: "Showcase the skills you want employers to notice." },
    { icon: "target", heading: "Improve opportunity matching", description: "Help Launchpad understand your technical and professional strengths." },
    { icon: "sparkle", heading: "Keep your profile flexible", description: "You can update your skills anytime as you grow." },
  ],
  "/onboarding/experience": [
    { icon: "briefcase", heading: "Show your experience", description: "Highlight the roles and responsibilities you've handled." },
    { icon: "building", heading: "Strengthen your profile", description: "Help recruiters understand your career background." },
    { icon: "rocket", heading: "Just getting started?", description: "You can continue without adding experience." },
  ],
  "/onboarding/career": [
    { icon: "target", heading: "Tell us what you're looking for", description: "Choose the roles and industries that match your goals." },
    { icon: "search", heading: "Improve opportunity matching", description: "Help us surface more relevant opportunities for you." },
    { icon: "sparkle", heading: "Update anytime", description: "Your interests can evolve with your career." },
  ],
  "/onboarding/goal": [
    { icon: "target", heading: "Define your direction", description: "Tell us where you want your career to go." },
    { icon: "profile", heading: "Personalize your journey", description: "Help Launchpad recommend the most relevant next steps." },
    { icon: "rocket", heading: "Keep moving forward", description: "You can update your goal as your plans evolve." },
  ],
};

/** Picks the copy/CTA for the "what do I do next" panel. Reuses the
 * backend's own next-action text when it already describes the same
 * step this journey says is current; falls back to a short generic
 * line otherwise. */
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
      benefits: [],
    };
  }

  const current = steps[currentIndex];
  const backendDescribesCurrentStep = nextAction.route === current.path;

  return {
    eyebrow: `Step ${currentIndex + 1} of ${steps.length}`,
    title: backendDescribesCurrentStep ? nextAction.title : current.label,
    description: backendDescribesCurrentStep
      ? nextAction.description
      : `Continue building your profile with ${current.label}.`,
    ctaLabel: currentIndex === steps.length - 1 ? "Finish your profile →" : `Continue to ${current.label} →`,
    ctaHref: current.path,
    benefits: STEP_BENEFITS[current.path] ?? [],
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
