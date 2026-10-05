"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { stepNeighbors } from "@/features/onboarding/steps";
import { getPreferences, updatePreferences } from "@/lib/candidate/client";

const { previousPath, nextPath } = stepNeighbors("/onboarding/career");

function TagInput({
  label,
  placeholder,
  values,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (value) {
      onAdd(value);
      setDraft("");
    }
  }

  return (
    <div>
      <label>
        {label}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" onClick={add}>
            Add
          </button>
        </div>
      </label>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
        {values.map((value) => (
          <li
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              backgroundColor: "#e5e7eb",
            }}
          >
            {value}
            <button type="button" onClick={() => onRemove(value)} aria-label={`Remove ${value}`}>
              &times;
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    return <p style={{ padding: "2rem" }}>Loading...</p>;
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
      <TagInput
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
      <TagInput
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
