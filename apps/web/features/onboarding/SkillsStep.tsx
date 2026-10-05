"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingStepShell } from "@/features/onboarding/OnboardingStepShell";
import { stepNeighbors } from "@/features/onboarding/steps";
import { addSkill, listSkills, removeSkill } from "@/lib/candidate/client";
import type { CandidateSkill } from "@/lib/candidate/types";

const { previousPath, nextPath } = stepNeighbors("/onboarding/skills");

export function SkillsStep() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skills, setSkills] = useState<CandidateSkill[]>([]);

  useEffect(() => {
    listSkills().then((result) => {
      if (result.ok) setSkills(result.data);
      setIsLoading(false);
    });
  }, []);

  async function handleAddSkill() {
    const name = skillName.trim();
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
    setSkillName("");
  }

  async function handleRemoveSkill(id: string) {
    const result = await removeSkill(id);
    if (result.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function handleContinue() {
    setIsSubmitting(true);
    router.push(nextPath);
  }

  if (isLoading) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
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
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          placeholder="e.g. Python"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSkill();
            }
          }}
        />
        <button type="button" onClick={handleAddSkill}>
          Add
        </button>
      </div>

      <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", listStyle: "none", padding: 0 }}>
        {skills.map((skill) => (
          <li
            key={skill.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              backgroundColor: "#e5e7eb",
            }}
          >
            {skill.name}
            <button type="button" onClick={() => handleRemoveSkill(skill.id)} aria-label={`Remove ${skill.name}`}>
              &times;
            </button>
          </li>
        ))}
      </ul>
    </OnboardingStepShell>
  );
}
