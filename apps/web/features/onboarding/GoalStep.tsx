"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { stepNeighbors } from "@/features/onboarding/steps";
import { getProfile, updateProfile } from "@/lib/candidate/client";

const { previousPath } = stepNeighbors("/onboarding/goal");

export function GoalStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [careerGoal, setCareerGoal] = useState("");

  useEffect(() => {
    getProfile().then((result) => {
      if (result.ok) setCareerGoal(result.data.career_goal ?? "");
      setIsLoading(false);
    });
  }, []);

  async function handleContinue() {
    if (!careerGoal.trim()) {
      setError("Please describe what you're looking for.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await updateProfile({ career_goal: careerGoal });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/onboarding");
  }

  if (isLoading) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  return (
    <OnboardingStepShell
      path="/onboarding/goal"
      title="Career Goal"
      description="What kind of job are you looking for?"
      onBack={() => router.push(previousPath)}
      onContinue={handleContinue}
      isSubmitting={isSubmitting}
      error={error}
      continueLabel="Finish"
    >
      <label>
        Career goal
        <textarea
          value={careerGoal}
          onChange={(e) => setCareerGoal(e.target.value)}
          rows={5}
          maxLength={2000}
        />
      </label>
    </OnboardingStepShell>
  );
}
