"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { OnboardingStepSkeleton } from "@/features/onboarding/OnboardingStepSkeleton";
import { stepNeighbors } from "@/features/onboarding/steps";
import { createEducation, listEducation, updateEducation } from "@/lib/candidate/client";

const { previousPath, nextPath } = stepNeighbors("/onboarding/education");

export function EducationStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  useEffect(() => {
    listEducation().then((result) => {
      if (result.ok && result.data.length > 0) {
        const first = result.data[0];
        setExistingId(first.id);
        setInstitution(first.institution);
        setDegree(first.degree);
        setSpecialization(first.specialization ?? "");
        setGraduationYear(first.graduation_year?.toString() ?? "");
      }
      setIsLoading(false);
    });
  }, []);

  async function handleContinue() {
    if (!institution.trim() || !degree.trim()) {
      setError("Institution and degree are required.");
      return;
    }

    const year = graduationYear.trim() ? Number(graduationYear) : null;
    if (graduationYear.trim() && (!Number.isInteger(year) || year! < 1950 || year! > 2100)) {
      setError("Please enter a valid graduation year.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const payload = {
      institution,
      degree,
      specialization: specialization.trim() || null,
      graduation_year: year,
      start_year: null,
      education_status: null,
    };

    const result = existingId
      ? await updateEducation(existingId, payload)
      : await createEducation(payload);

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
      path="/onboarding/education"
      title="Education"
      description="Tell us about your most recent education."
      onBack={() => router.push(previousPath)}
      onContinue={handleContinue}
      isSubmitting={isSubmitting}
      error={error}
    >
      <label>
        Institution
        <input value={institution} onChange={(e) => setInstitution(e.target.value)} />
      </label>
      <label>
        Degree
        <input value={degree} onChange={(e) => setDegree(e.target.value)} />
      </label>
      <label>
        Specialisation
        <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
      </label>
      <label>
        Graduation year
        <input
          type="number"
          value={graduationYear}
          onChange={(e) => setGraduationYear(e.target.value)}
        />
      </label>
    </OnboardingStepShell>
  );
}
