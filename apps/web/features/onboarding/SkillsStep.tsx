"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChipList } from "@/components/ChipList";
import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { OnboardingStepSkeleton } from "@/features/onboarding/OnboardingStepSkeleton";
import { stepNeighbors } from "@/features/onboarding/steps";
import { addSkill, listSkills, removeSkill } from "@/lib/candidate/client";
import type { CandidateSkill } from "@/lib/candidate/types";

const { previousPath, nextPath } = stepNeighbors("/onboarding/skills");

export function SkillsStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);

  useEffect(() => {
    listSkills().then((result) => {
      if (result.ok) setSkills(result.data);
      setIsLoading(false);
    });
  }, []);

  async function handleAddSkill(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError("That skill has already been added.");
      return;
    }

    setError(null);
    const result = await addSkill(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSkills((prev) => [...prev, result.data]);
  }

  async function handleRemoveSkill(id: string) {
    const result = await removeSkill(id);
    if (result.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function handleContinue() {
    if (skills.length === 0) {
      setError("Add at least one skill to continue.");
      return;
    }
    setIsSubmitting(true);
    router.push(nextPath);
  }

  if (isLoading) {
    return <OnboardingStepSkeleton />;
  }

  return (
    <OnboardingStepShell
      path="/onboarding/skills"
      title="Skills"
      description="Add the skills you'd like recruiters to see."
      onBack={() => router.push(previousPath)}
      onContinue={handleContinue}
      isSubmitting={isSubmitting}
      error={error}
    >
      <ChipList
        label="Skills"
        placeholder="e.g. Python"
        values={skills.map((skill) => skill.name)}
        onAdd={handleAddSkill}
        onRemove={(name) => {
          const skill = skills.find((s) => s.name === name);
          if (skill) handleRemoveSkill(skill.id);
        }}
      />
    </OnboardingStepShell>
  );
}
