"use client";

import { useRouter } from "next/navigation";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { stepNeighbors } from "@/features/onboarding/steps";
import { WorkExperienceSection } from "@/features/profile/WorkExperienceSection";
import type { WorkExperience } from "@/lib/candidate/types";

const { previousPath, nextPath } = stepNeighbors("/onboarding/experience");

type ExperienceStepProps = {
  experience: WorkExperience[];
};

/** Reuses features/profile's WorkExperienceSection exactly as the
 * profile page does -- it already renders its own add/edit <form>
 * (ExperienceForm) and refreshes via router.refresh(), which is why
 * this step is a server-rendered page (see app/onboarding/experience/
 * page.tsx) passing experience down as a prop, same pattern as the
 * profile page, rather than a client-side fetch like the other steps.
 * Continue never blocks on having an entry -- work experience isn't
 * mandatory here, same as Skills. */
export function ExperienceStep({ experience }: ExperienceStepProps) {
  const router = useRouter();

  return (
    <OnboardingStepShell
      path="/onboarding/experience"
      title="Work Experience"
      description="Add any job, internship, or part-time role you've held. Don't have work experience yet? You can skip this for now."
      onBack={() => router.push(previousPath)}
      onContinue={() => router.push(nextPath)}
      isSubmitting={false}
      error={null}
      useForm={false}
    >
      <WorkExperienceSection experience={experience} />
    </OnboardingStepShell>
  );
}
