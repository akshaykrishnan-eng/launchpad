"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ChipList } from "@/components/ChipList";
import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { OnboardingStepSkeleton } from "@/features/onboarding/OnboardingStepSkeleton";
import { stepNeighbors } from "@/features/onboarding/steps";
import { getPreferences, updatePreferences } from "@/lib/candidate/client";

const { previousPath, nextPath } = stepNeighbors("/onboarding/career");

export function CareerStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);

  useEffect(() => {
    getPreferences().then((result) => {
      if (result.ok) {
        setPreferredRoles(result.data.preferred_roles);
        setPreferredLocations(result.data.preferred_locations);
      }
      setIsLoading(false);
    });
  }, []);

  async function handleContinue() {
    setError(null);
    setIsSubmitting(true);
    const result = await updatePreferences({
      preferred_roles: preferredRoles,
      preferred_locations: preferredLocations,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(nextPath);
  }

  if (isLoading) {
    return <OnboardingStepSkeleton />;
  }

  return (
    <OnboardingStepShell
      path="/onboarding/career"
      title="Career Interests"
      description="What roles and locations are you interested in?"
      onBack={() => router.push(previousPath)}
      onContinue={handleContinue}
      isSubmitting={isSubmitting}
      error={error}
    >
      <ChipList
        label="Preferred roles"
        placeholder="e.g. Software Developer"
        values={preferredRoles}
        onAdd={(value) =>
          setPreferredRoles((prev) =>
            prev.some((v) => v.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value],
          )
        }
        onRemove={(value) => setPreferredRoles((prev) => prev.filter((v) => v !== value))}
      />
      <ChipList
        label="Preferred locations"
        placeholder="e.g. Remote"
        values={preferredLocations}
        onAdd={(value) =>
          setPreferredLocations((prev) =>
            prev.some((v) => v.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value],
          )
        }
        onRemove={(value) => setPreferredLocations((prev) => prev.filter((v) => v !== value))}
      />
    </OnboardingStepShell>
  );
}
