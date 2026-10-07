"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { OnboardingStepSkeleton } from "@/features/onboarding/OnboardingStepSkeleton";
import { stepNeighbors } from "@/features/onboarding/steps";
import { getProfile, updateProfile } from "@/lib/candidate/client";
import type { CandidateStatus } from "@/lib/candidate/types";

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "STUDENT", label: "Student" },
  { value: "RECENTLY_GRADUATED", label: "Recently graduated" },
  { value: "LOOKING_FOR_FIRST_JOB", label: "Looking for my first job" },
  { value: "CURRENTLY_EMPLOYED", label: "Currently employed" },
];

const { previousPath, nextPath } = stepNeighbors("/onboarding/about");

export function AboutStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [currentStatus, setCurrentStatus] = useState<CandidateStatus | "">("");

  useEffect(() => {
    getProfile().then((result) => {
      if (result.ok) {
        setFirstName(result.data.first_name ?? "");
        setLastName(result.data.last_name ?? "");
        setMobileNumber(result.data.mobile_number ?? "");
        setCurrentCity(result.data.current_city ?? "");
        setCurrentStatus(result.data.current_status ?? "");
      }
      setIsLoading(false);
    });
  }, []);

  async function handleContinue() {
    if (!firstName.trim() || !lastName.trim() || !mobileNumber.trim() || !currentCity.trim() || !currentStatus) {
      setError("Please fill in every field.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await updateProfile({
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber,
      current_city: currentCity,
      current_status: currentStatus,
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
      path="/onboarding/about"
      title="About You"
      description="Let's start with the basics."
      onBack={() => router.push(previousPath)}
      onContinue={handleContinue}
      isSubmitting={isSubmitting}
      error={error}
    >
      {/* No `required` attributes: native HTML validation would block
          the submit handler before our own validation (and its error
          message) ever ran. */}
      <div className="form-row-2">
        <label>
          First name
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
      </div>
      <div className="form-row-2">
        <label>
          Mobile number
          <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
        </label>
        <label>
          Current city
          <input value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} />
        </label>
      </div>
      <label>
        Current status
        <select
          value={currentStatus}
          onChange={(e) => setCurrentStatus(e.target.value as CandidateStatus)}
        >
          <option value="" disabled>
            Select one
          </option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </OnboardingStepShell>
  );
}
