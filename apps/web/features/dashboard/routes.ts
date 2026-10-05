import type { ProfileCompletionComponents } from "@/lib/candidate/types";

/** Where each readiness item's "edit this" link goes. This is pure UI
 * routing -- which page edits which section -- not business state, so
 * it stays on the frontend; the backend owns whether each component is
 * actually complete (see Dashboard.profile_completion.components). */
export const READINESS_ITEMS: {
  key: keyof ProfileCompletionComponents;
  label: string;
  href: string;
}[] = [
  { key: "personal_information", label: "Personal Information", href: "/onboarding/about" },
  { key: "education", label: "Education", href: "/onboarding/education" },
  { key: "skills", label: "Skills", href: "/onboarding/skills" },
  { key: "experience", label: "Work Experience", href: "/app/profile" },
  { key: "career_preferences", label: "Career Preferences", href: "/onboarding/career" },
  { key: "career_goal", label: "Career Goal", href: "/onboarding/goal" },
];
