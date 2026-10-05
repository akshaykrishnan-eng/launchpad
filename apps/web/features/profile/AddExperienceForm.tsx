"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createExperience } from "@/lib/candidate/client";

export function AddExperienceForm() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createExperience({
      company,
      job_title: jobTitle,
      location: null,
      start_date: startDate,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description: null,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCompany("");
    setJobTitle("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
      <label>
        Company
        <input value={company} onChange={(e) => setCompany(e.target.value)} required />
      </label>
      <label>
        Job title
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
      </label>
      <label>
        Start date
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
        {" "}I currently work here
      </label>
      {!isCurrent && (
        <label>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add experience"}
      </button>
    </form>
  );
}
