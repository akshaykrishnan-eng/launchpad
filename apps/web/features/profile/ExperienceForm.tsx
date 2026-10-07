"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createExperience, updateExperience } from "@/lib/candidate/client";
import type { WorkExperience } from "@/lib/candidate/types";

type ExperienceFormProps = {
  /** The entry being edited, or null when adding a new one. */
  experience: WorkExperience | null;
  onCancel: () => void;
  onSaved: () => void;
};

export function ExperienceForm({ experience, onCancel, onSaved }: ExperienceFormProps) {
  const router = useRouter();
  const [company, setCompany] = useState(experience?.company ?? "");
  const [jobTitle, setJobTitle] = useState(experience?.job_title ?? "");
  const [startDate, setStartDate] = useState(experience?.start_date ?? "");
  const [endDate, setEndDate] = useState(experience?.end_date ?? "");
  const [isCurrent, setIsCurrent] = useState(experience?.is_current ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      company,
      job_title: jobTitle,
      location: experience?.location ?? null,
      start_date: startDate,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description: experience?.description ?? null,
    };

    const result = experience
      ? await updateExperience(experience.id, payload)
      : await createExperience(payload);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onSaved();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-surface-sunken)" }}
    >
      <div>
        <h3 style={{ fontSize: "0.9375rem" }}>{experience ? "Edit experience" : "Add experience"}</h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
          Tell us about a role you&apos;ve held.
        </p>
      </div>

      <label>
        Job title
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
      </label>
      <label>
        Company
        <input value={company} onChange={(e) => setCompany(e.target.value)} required />
      </label>

      <div>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>Employment period</p>
        <div className="form-row-2">
          <label>
            Start date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          {!isCurrent && (
            <label>
              End date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          )}
        </div>
      </div>

      <label>
        <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
        {" "}I currently work here
      </label>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save experience"}
        </button>
      </div>
    </form>
  );
}
